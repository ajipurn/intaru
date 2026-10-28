import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { displayGeometry, DISPLAY_VERSION } from './display-geometry.mjs';
import { difference } from '@turf/difference';
import { collectFeatureSymbols } from '../src/lib/map-symbols.ts';

const source = 'data/source';
const output = 'public/data';
let manifest;
try {
  manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'));
} catch (error) {
  if (error.code === 'ENOENT') {
    // Prepared datasets are local-only and may be supplied without raw exports.
    try {
      await readFile(join(output, 'index.json'));
    } catch (snapshotError) {
      if (snapshotError.code !== 'ENOENT') throw snapshotError;
      throw new Error('Dataset lokal belum tersedia. Jalankan pnpm data:export lalu pnpm data:prepare, atau sediakan salinan data/source/ dan public/data/.');
    }
    process.exit(0);
  }
  throw error;
}
if (!manifest.completed || manifest.mode !== 'all-public-map-data') {
  throw new Error('Full source export is incomplete; run pnpm data:export.');
}
await mkdir(join(output, 'geojson'), { recursive: true });
await mkdir(join(output, 'display'), { recursive: true });
const layers = [];
for (const resource of manifest.resources.filter((item) => item.file.endsWith('.geojson'))) {
  let contents, compressed;
  try { contents = await readFile(join(source, resource.file)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    compressed = await readFile(join(output, resource.file + '.gz'));
  }
  if (contents) {
    try { compressed = await readFile(join(output, resource.file + '.gz')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!compressed || !gunzipSync(compressed).equals(contents)) {
      compressed = gzipSync(contents, { level: 9 });
      await writeFile(join(output, resource.file + '.gz'), compressed);
    }
  }
  const originalContents = contents ?? gunzipSync(compressed);
  const original = JSON.parse(originalContents.toString('utf8'));
  const digest = createHash('sha256').update(DISPLAY_VERSION).update(originalContents).digest('hex').slice(0, 16);
  const displayPath = `display/${resource.file.replace('geojson/', '').replace('.geojson', '')}-${digest}.geojson.gz`;
  let display;
  try { display = await readFile(join(output, displayPath)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    display = gzipSync(JSON.stringify(displayGeometry(original)), { level: 9 });
    await writeFile(join(output, displayPath), display);
  }
  if (resource.name === 'Batas Kecamatan') {
    // Subtract the combined district boundaries at build time. The browser only
    // draws one non-interactive mask, even when administrative layers are off.
    const maskPath = join(output, 'kebumen-mask.geojson.gz');
    const sourceHash = createHash('sha256').update('mask-v1').update(DISPLAY_VERSION).update(originalContents).digest('hex');
    let cachedMask;
    try { cachedMask = JSON.parse(gunzipSync(await readFile(maskPath)).toString('utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (cachedMask?.sourceHash !== sourceHash) {
      const boundary = JSON.parse(originalContents.toString('utf8'));
      const world = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-360, -85.051129], [360, -85.051129], [360, 85.051129], [-360, 85.051129], [-360, -85.051129]]] } };
      const exterior = difference({ type: 'FeatureCollection', features: [world, ...boundary.features] });
      if (!exterior) throw new Error('Failed to prepare Kebumen exterior mask.');
      const mask = { ...displayGeometry({ type: 'FeatureCollection', features: [exterior] }), sourceHash };
      await writeFile(maskPath, gzipSync(JSON.stringify(mask), { level: 9 }));
    }
  }
  layers.push({
    id: resource.sourceId ?? resource.file.replace('geojson/', '').replace('.geojson', ''),
    name: resource.name,
    category: resource.category,
    asset_path: '/data/' + resource.file + '.gz',
    display_asset_path: '/data/' + displayPath,
    source_bytes: compressed.length,
    display_bytes: display.length,
    symbol_ids: collectFeatureSymbols(resource.name, original.features).map((symbol) => symbol.id),
    feature_count: resource.features,
    bounds: resource.bounds,
  });
}
const retained = new Set(layers.map((layer) => layer.display_asset_path.split('/').at(-1)));
for (const file of await readdir(join(output, 'display'))) {
  if (file.endsWith('.geojson.gz') && !retained.has(file)) await unlink(join(output, 'display', file));
}
await writeFile(join(output, 'villages.json'), await readFile(join(source, 'villages.json')));
await writeFile(join(output, 'index.json'), JSON.stringify({
  sourceUrl: manifest.sourceUrl,
  exportedAt: manifest.exportedAt,
  layers,
}));
console.log(`Prepared ${layers.length} compressed map layers and public content.`);
