import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import { overpassFilters } from '../src/lib/facilities.ts';
import { KEBUMEN_BOUNDS } from '../src/lib/region-view.ts';
import { bpsTableFromHtml } from './bps-table.mjs';

// Raw enrichment sources, kept with their retrieval metadata so updates can be repeated.
// Pass source names (penduduk, fasilitas, luas) to refresh only those; the rest stay as exported.
const OUTPUT = 'data/enrichment';
const USER_AGENT = 'INTARU-data-enrichment/0.1 (Kebumen spatial plan viewer)';
const POPULATION_DATASET = 'https://opendata.kebumenkab.go.id/api/3/action/package_show?id=jumlah-penduduk-per-kecamatan-tahun-2025-e15fce';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
// The page renders without its table unless the year is given.
const BPS_AREA = 'https://kebumenkab.bps.go.id/id/statistics-table/3/VUZwV01tSlpPVlpsWlRKbmMxcFhhSGhEVjFoUFFUMDkjMw==/luas-daerah-dan-jumlah-pulau-menurut-kecamatan-di-kabupaten-kebumen--2024.html?year=2025';
const SOURCES = ['penduduk', 'fasilitas', 'luas'];
const only = process.argv.slice(2);
const unknown = only.filter((name) => !SOURCES.includes(name));
if (unknown.length) throw new Error(`Unknown source ${unknown.join(', ')}; choose from ${SOURCES.join(', ')}.`);
const wanted = (name) => !only.length || only.includes(name);

async function fetchOk(url, init = {}, attempts = 5) {
  for (let attempt = 1; ; attempt++) {
    try {
      // Overpass rejects requests without an identifying User-Agent.
      const response = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...init.headers }, signal: AbortSignal.timeout(300_000) });
      if (response.ok) return response;
      // Busy public servers answer 429 or 5xx; anything else will not improve on retry.
      if (response.status !== 429 && response.status < 500) throw Object.assign(new Error(`${url}: HTTP ${response.status}`), { final: true });
      throw new Error(`${url}: HTTP ${response.status}`);
    } catch (error) {
      if (error.final || attempt === attempts) throw error;
      console.warn(`Attempt ${attempt} failed (${error.cause?.code ?? error.message}); retrying.`);
      await setTimeout(15_000 * attempt);
    }
  }
}

await mkdir(OUTPUT, { recursive: true });
let resources = [];
try {
  resources = JSON.parse(await readFile(join(OUTPUT, 'manifest.json'), 'utf8')).resources;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
async function save(file, bytes, metadata) {
  await writeFile(join(OUTPUT, file), bytes);
  const resource = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), retrievedAt: new Date().toISOString(), ...metadata };
  resources = [...resources.filter((item) => item.file !== file), resource];
  await writeFile(join(OUTPUT, 'manifest.json'), JSON.stringify({ exportedAt: new Date().toISOString(), resources }, null, 2) + '\n');
  console.log(`Saved ${file} (${bytes.length.toLocaleString('en-US')} bytes)`);
}

if (wanted('penduduk')) {
  const { result: dataset } = await (await fetchOk(POPULATION_DATASET)).json();
  const workbook = dataset.resources.find((resource) => resource.format?.toUpperCase() === 'XLSX');
  if (!workbook) throw new Error('The population dataset no longer offers an XLSX resource.');
  await save('penduduk-kecamatan.xlsx', Buffer.from(await (await fetchOk(workbook.url)).arrayBuffer()), {
    source: workbook.url,
    dataset: dataset.title,
    publisher: dataset.organization?.title ?? dataset.author,
    license: dataset.license_title ?? 'Tidak dicantumkan (No License Provided)',
    modified: dataset.metadata_modified,
  });
}

if (wanted('fasilitas')) {
  // Public facilities in a box around Kebumen; prepare-enrichment clips them to the regency.
  const [[south, west], [north, east]] = KEBUMEN_BOUNDS;
  const bbox = [south - 0.01, west - 0.01, north + 0.01, east + 0.01].map((value) => value.toFixed(4)).join(',');
  const query = `[out:json][timeout:240];(${overpassFilters().map((filter) => `nwr${filter}(${bbox});`).join('')});out center tags;`;
  const osm = await (await fetchOk(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: query }) })).text();
  await save('osm-facilities.json.gz', gzipSync(osm), {
    source: OVERPASS,
    query,
    publisher: 'Kontributor OpenStreetMap',
    license: 'ODbL 1.0',
    osmTimestamp: JSON.parse(osm).osm3s?.timestamp_osm_base,
  });
}

if (wanted('luas')) {
  // Official district area from BPS (Podes), for population density.
  const html = await (await fetchOk(BPS_AREA)).text();
  const table = bpsTableFromHtml(html);
  await save('bps-luas-kecamatan.html', Buffer.from(html), {
    source: BPS_AREA,
    dataset: table.judul_tabel,
    year: table.tahun_data,
    publisher: 'BPS Kabupaten Kebumen',
    license: 'Bebas digunakan dengan menyebut BPS sebagai sumber (https://kebumenkab.bps.go.id/id/term-of-use)',
    modified: table.table_created,
  });
}

console.log(`Manifest lists ${resources.length} enrichment sources in ${OUTPUT}.`);
