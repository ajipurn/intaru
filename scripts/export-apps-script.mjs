import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export const SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxTNBb_lzPMLlIqEMPue0QPFcXyjRTcLhJZTt0rmB_yqCn87Ihtn_Qv197eeZ_sgbKx/exec';

// These read operations are used by the public application. Admin functions
// are deliberately outside this exporter.
const READ_FUNCTIONS = new Set([
  'getLayerCatalog',
  'getDesaKecamatan',
  'getBatasDesa',
  'getBatasKecamatan',
  'getGeoJSONByFileId',
]);

export function parseResponse(text) {
  const payload = JSON.parse(text.replace(/^\)\]\}'\s*/, ''));
  const execution = payload.find((entry) => entry[0] === 'op.exec');
  const success = execution?.[1];
  if (!Array.isArray(success) || typeof success[1] !== 'string') {
    throw new Error('Apps Script did not return a successful execution result.');
  }
  return JSON.parse(success[1]);
}

export async function readPublicData(sourceUrl, functionName, parameters = []) {
  if (!READ_FUNCTIONS.has(functionName)) {
    throw new Error(`Unsupported public read operation: ${functionName}`);
  }
  const url = new URL(sourceUrl);
  if (url.hostname !== 'script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)) {
    throw new Error('Expected a Google Apps Script /macros/s/…/exec URL.');
  }
  url.pathname = url.pathname.replace(/\/exec$/, '/callback');
  url.search = '';
  url.searchParams.set('nocache_id', String(Date.now()));
  const request = [functionName, JSON.stringify(parameters), null, [0], null, null, true, 0];
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'X-Same-Domain': '1',
    },
    body: new URLSearchParams({ request: JSON.stringify(request) }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`${functionName}: HTTP ${response.status}`);
  }
  return parseResponse(await response.text());
}

function slug(value) {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function catalogLayers(catalog) {
  return [
    ...(catalog.polaRuang ?? []).map((layer) => ({ ...layer, category: 'pola-ruang' })),
    ...(catalog.ketentuanKhusus ?? []).map((layer) => ({ ...layer, category: 'ketentuan-khusus' })),
    ...['strukturRuang', 'lsd', 'lp2b'].flatMap((key) => catalog[key] ? [{ ...catalog[key], category: key }] : []),
  ];
}

export function asGeoJSON(value) {
  let data = typeof value === 'string' ? JSON.parse(value) : value;
  if (data?.type === 'Feature') data = { type: 'FeatureCollection', features: [data] };
  else if (data?.type === 'GeometryCollection') {
    data = { type: 'FeatureCollection', features: data.geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })) };
  }
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection.');
  }
  return data;
}

export function summarizeGeometry(data) {
  const geometryTypes = {};
  const propertyNames = new Set();
  let positions = 0;
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  function visit(coordinates) {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      const [x, y] = coordinates;
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Non-finite coordinate.');
      positions++;
      bounds[0] = Math.min(bounds[0], x);
      bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x);
      bounds[3] = Math.max(bounds[3], y);
      return;
    }
    coordinates.forEach(visit);
  }
  function visitGeometry(geometry) {
    if (!geometry) return;
    geometryTypes[geometry.type] = (geometryTypes[geometry.type] ?? 0) + 1;
    if (geometry.type === 'GeometryCollection') geometry.geometries.forEach(visitGeometry);
    else visit(geometry.coordinates);
  }
  for (const feature of data.features) {
    visitGeometry(feature.geometry);
    Object.keys(feature.properties ?? {}).forEach((key) => propertyNames.add(key));
  }
  return {
    features: data.features.length,
    positions,
    geometryTypes,
    propertyNames: [...propertyNames].sort(),
    bounds: positions ? bounds : null,
  };
}

export async function exportPublicData({ sourceUrl = SOURCE_URL, outputDirectory, all = false, resume = false }) {
  await mkdir(join(outputDirectory, 'geojson'), { recursive: true });
  let previous;
  if (resume) {
    previous = JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8'));
    if (previous.sourceUrl !== sourceUrl) throw new Error('Resume source URL does not match.');
  }
  async function acquire(file, functionName, parameters = []) {
    const saved = previous?.resources.find((item) => item.file === file);
    if (saved) {
      const text = await readFile(join(outputDirectory, file), 'utf8');
      if (createHash('sha256').update(text).digest('hex') !== saved.sha256) throw new Error(`Checksum mismatch: ${file}`);
      return JSON.parse(text);
    }
    return readPublicData(sourceUrl, functionName, parameters);
  }
  const manifest = {
    sourceUrl,
    exportedAt: new Date().toISOString(),
    mode: all ? 'all-public-map-data' : 'sample',
    resources: [],
    errors: [],
  };
  async function save(file, data, metadata) {
    const text = JSON.stringify(data) + '\n';
    await writeFile(join(outputDirectory, file), text);
    manifest.resources.push({
      file,
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
      ...metadata,
    });
    await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Saved ${file} (${Buffer.byteLength(text).toLocaleString('en-US')} bytes)`);
  }

  const catalog = await acquire('catalog.json', 'getLayerCatalog');
  const layers = catalogLayers(catalog);
  manifest.catalogLayerCount = layers.length;
  await save('catalog.json', catalog, { function: 'getLayerCatalog', layers: layers.length });

  for (const [functionName, file] of [['getDesaKecamatan', 'villages.json']]) {
    await setTimeout(600);
    try {
      const data = await acquire(file, functionName);
      await save(file, data, { function: functionName, records: Array.isArray(data) ? data.length : null });
    } catch (error) {
      manifest.errors.push({ function: functionName, message: error.message });
      console.error(`${functionName}: ${error.message}`);
    }
  }

  const selectedLayers = all ? layers : layers.filter((layer) => layer.name === 'Kawasan Ekosistem Mangrove');
  const tasks = selectedLayers.map((layer) => ({
    name: layer.name,
    category: layer.category,
    sourceId: layer.id,
    coordinateSystem: layer.coordinateSystem ?? 'WGS84',
    function: 'getGeoJSONByFileId',
    parameters: layer.coordinateSystem ? [layer.id, layer.coordinateSystem] : [layer.id],
    file: `geojson/${layer.category}-${slug(layer.name)}.geojson`,
  }));
  if (!all && !selectedLayers.length) throw new Error('The expected sample layer is absent from the source catalog.');
  if (all) {
    tasks.push(
      { name: 'Batas Desa / Kelurahan', category: 'administrasi', function: 'getBatasDesa', parameters: [], file: 'geojson/batas-desa.geojson' },
      { name: 'Batas Kecamatan', category: 'administrasi', function: 'getBatasKecamatan', parameters: [], file: 'geojson/batas-kecamatan.geojson' },
    );
  }
  for (const task of tasks) {
    await setTimeout(600);
    try {
      const data = asGeoJSON(await acquire(task.file, task.function, task.parameters));
      const { file, parameters, ...metadata } = task;
      await save(file, data, { ...metadata, ...summarizeGeometry(data) });
    } catch (error) {
      manifest.errors.push({ file: task.file, function: task.function, message: error.message });
      console.error(`${task.name}: ${error.message}`);
    }
  }
  manifest.completed = manifest.errors.length === 0;
  manifest.completedAt = new Date().toISOString();
  await writeFile(join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (manifest.errors.length) throw new Error(`${manifest.errors.length} resources could not be exported. See manifest.json.`);
  return manifest;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('node scripts/export-apps-script.mjs [--all] [--resume] [--out directory]\nDefault: catalog, villages, and one GeoJSON sample.\n--all: all catalogued layers and both administrative boundaries, sequentially.\n--resume: reuse checksummed successful resources and retry missing resources.');
    return;
  }
  const outputIndex = args.indexOf('--out');
  if (outputIndex >= 0 && (!args[outputIndex + 1] || args[outputIndex + 1].startsWith('--'))) {
    throw new Error('--out requires an output directory.');
  }
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--out') { index++; continue; }
    if (!['--all', '--resume'].includes(args[index])) throw new Error(`Unknown option: ${args[index]}`);
  }
  const manifest = await exportPublicData({
    outputDirectory: resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'data/source'),
    all: args.includes('--all'),
    resume: args.includes('--resume'),
  });
  console.log(`Export complete: ${manifest.resources.length} resources, ${manifest.errors.length} errors.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
