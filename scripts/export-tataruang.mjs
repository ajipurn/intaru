import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { asGeoJSON, summarizeGeometry } from './export-apps-script.mjs';
import { STRUCTURE_LAYERS, TATARUANG_SOURCE, structureLayerFile, structureLayerId } from '../src/lib/structure-layers.ts';

// The portal sends no CORS headers, so layers are downloaded here and served
// from INTARU's own storage. It publishes no terms of use (checked 2026-10-28).
const USER_AGENT = 'INTARU data export (+https://github.com/ajipurn/intaru)';
const GEOMETRY_TYPES = { point: ['Point', 'MultiPoint'], line: ['LineString', 'MultiLineString'] };
// Generous Kebumen envelope: confirms the portal still serves WGS84 lon/lat.
const KEBUMEN_ENVELOPE = [109.2, -8.1, 110.0, -7.3];

/** Point coordinates arrive as [x, y, 0, -1.797e308]; keep x and y only. */
export function planarGeometry(geometry) {
  const strip = (coordinates) => typeof coordinates[0] === 'number' ? coordinates.slice(0, 2) : coordinates.map(strip);
  if (!geometry) return geometry;
  if (geometry.type === 'GeometryCollection') return { ...geometry, geometries: geometry.geometries.map(planarGeometry) };
  return { ...geometry, coordinates: strip(geometry.coordinates) };
}

/** Year of a source note: the latest four-digit year not after `until`. */
export function sourceYear(value, until) {
  const years = [...String(value ?? '').matchAll(/(?<!\d)(19|20)\d{2}(?!\d)/g)].map((match) => Number(match[0])).filter((year) => year <= until);
  return years.length ? Math.max(...years) : null;
}

/** Portal layer titles by id, read from the `strukturConfig` array on the map page. */
export function parseStructureConfig(html) {
  const match = html.match(/var\s+strukturConfig\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('The portal map page no longer lists struktur layers (strukturConfig).');
  return new Map(JSON.parse(match[1]).map((item) => [Number(item.id), item.judul]));
}

const comparable = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, '');

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function exportStructureLayers({ outputDirectory }) {
  await mkdir(join(outputDirectory, 'raw'), { recursive: true });
  await mkdir(join(outputDirectory, 'geojson'), { recursive: true });
  const titles = parseStructureConfig(await download(TATARUANG_SOURCE.url));
  const exportedAt = new Date().toISOString();
  const until = new Date(exportedAt).getUTCFullYear();
  const manifest = {
    source: TATARUANG_SOURCE.label,
    publisher: TATARUANG_SOURCE.publisher,
    contact: 'dpupr.kebumenkab@gmail.com',
    pageUrl: TATARUANG_SOURCE.url,
    license: null,
    licenseNote: 'Portal tidak mencantumkan ketentuan penggunaan atau lisensi (diperiksa 28 Oktober 2026).',
    exportedAt,
    resources: [],
  };
  for (const layer of STRUCTURE_LAYERS) {
    await setTimeout(600);
    const title = titles.get(layer.portalId);
    if (comparable(title) !== comparable(layer.name)) throw new Error(`Portal layer ${layer.portalId} is "${title}", expected "${layer.name}".`);
    const url = TATARUANG_SOURCE.geojsonUrl(layer.portalId);
    const retrievedAt = new Date().toISOString();
    const text = await download(url);
    const rawFile = `raw/struktur-${layer.portalId}.geojson`;
    await writeFile(join(outputDirectory, rawFile), text);

    const source = asGeoJSON(text);
    let stripped = 0;
    const data = {
      type: 'FeatureCollection',
      features: source.features.map((feature) => {
        const geometry = planarGeometry(feature.geometry);
        if (JSON.stringify(geometry) !== JSON.stringify(feature.geometry)) stripped++;
        return { type: 'Feature', properties: feature.properties ?? {}, geometry };
      }),
    };
    const summary = summarizeGeometry(data);
    const unexpected = Object.keys(summary.geometryTypes).filter((type) => !GEOMETRY_TYPES[layer.kind].includes(type));
    if (!data.features.length || unexpected.length) throw new Error(`${layer.name}: expected ${layer.kind} features, got ${JSON.stringify(summary.geometryTypes)}.`);
    const [west, south, east, north] = summary.bounds;
    if (west < KEBUMEN_ENVELOPE[0] || south < KEBUMEN_ENVELOPE[1] || east > KEBUMEN_ENVELOPE[2] || north > KEBUMEN_ENVELOPE[3]) {
      throw new Error(`${layer.name}: bounds ${summary.bounds.join(', ')} are outside Kebumen; check the coordinate system.`);
    }

    const notes = new Map();
    for (const feature of data.features) {
      const value = String(feature.properties.SBDATA ?? '').trim();
      notes.set(value, (notes.get(value) ?? 0) + 1);
    }
    const sbdata = [...notes].map(([value, features]) => ({ value, features, year: sourceYear(value, until) }));
    const years = sbdata.map((item) => item.year).filter((year) => year !== null);

    const file = structureLayerFile(layer);
    const contents = JSON.stringify(data) + '\n';
    await writeFile(join(outputDirectory, file), contents);
    manifest.resources.push({
      file,
      bytes: Buffer.byteLength(contents),
      sha256: createHash('sha256').update(contents).digest('hex'),
      name: layer.name,
      category: 'strukturRuang',
      sourceId: structureLayerId(layer.portalId),
      portalId: layer.portalId,
      sourceTitle: title,
      url,
      retrievedAt,
      raw: { file: rawFile, bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') },
      strippedCoordinates: stripped,
      dataYears: years.length ? [Math.min(...years), Math.max(...years)] : null,
      sbdata,
      ...summary,
    });
    console.log(`Saved ${layer.name}: ${data.features.length} features, ${stripped} with extra dimensions removed.`);
  }
  manifest.completed = true;
  manifest.completedAt = new Date().toISOString();
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node --experimental-strip-types scripts/export-tataruang.mjs [--out directory]\nDownloads the struktur ruang layers listed in src/lib/structure-layers.ts. Default output: data/source/tataruang.');
  } else {
    const outputIndex = args.indexOf('--out');
    exportStructureLayers({ outputDirectory: resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'data/source/tataruang') })
      .then((manifest) => console.log(`Export complete: ${manifest.resources.length} layers.`))
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
