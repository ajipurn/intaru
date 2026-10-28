import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { gzipSync } from 'node:zlib';
import { overpassFilters } from '../src/lib/facilities.ts';
import { KEBUMEN_BOUNDS } from '../src/lib/region-view.ts';

// Raw enrichment sources, kept with their retrieval metadata so updates can be repeated.
const OUTPUT = 'data/enrichment';
const USER_AGENT = 'INTARU-data-enrichment/0.1 (Kebumen spatial plan viewer)';
const POPULATION_DATASET = 'https://opendata.kebumenkab.go.id/api/3/action/package_show?id=jumlah-penduduk-per-kecamatan-tahun-2025-e15fce';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

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

const resources = [];
async function save(file, bytes, metadata) {
  await writeFile(join(OUTPUT, file), bytes);
  resources.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), retrievedAt: new Date().toISOString(), ...metadata });
  await writeFile(join(OUTPUT, 'manifest.json'), JSON.stringify({ exportedAt: new Date().toISOString(), resources }, null, 2) + '\n');
  console.log(`Saved ${file} (${bytes.length.toLocaleString('en-US')} bytes)`);
}

await mkdir(OUTPUT, { recursive: true });

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

console.log(`Saved ${resources.length} enrichment sources to ${OUTPUT}.`);
