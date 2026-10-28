import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Never use a VITE_ prefix for the service role key.');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const root = 'public/data';
const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8'));
// --assets-only refreshes layer metadata and Storage files without re-importing features.
const assetsOnly = process.argv.includes('--assets-only');
function check(result, context) { if (result.error) throw new Error(`${context}: ${result.error.message}`); return result.data; }
async function upload(path, cacheControl = '3600') {
  const contents = await readFile(join(root, path));
  check(await supabase.storage.from('map-data').upload(path, contents, { contentType: 'application/gzip', upsert: true, cacheControl }), `Upload ${path}`);
  return { contents, url: supabase.storage.from('map-data').getPublicUrl(path).data.publicUrl };
}
const storagePath = (assetPath) => assetPath.replace(/^\/data\//, '');

// Verify the migration is present before uploading anything.
check(await supabase.from('map_layers').select('id, display_asset_path, symbol_ids').limit(1), 'Check migration');
const villages = JSON.parse(await readFile(join(root, 'villages.json'), 'utf8'));
if (!assetsOnly) check(await supabase.from('villages').upsert(villages.map((item) => ({ name: item.DESAKEL, district: item.KECAMATAN })), { onConflict: 'name,district' }), 'Import villages');

for (let order = 0; order < index.layers.length; order++) {
  const layer = index.layers[order];
  const { contents: compressed, url: assetUrl } = await upload(storagePath(layer.asset_path));
  // Display files are named by content hash, so browsers may cache them for a year.
  const display = layer.display_asset_path ? await upload(storagePath(layer.display_asset_path), '31536000') : null;
  check(await supabase.from('map_layers').upsert({ id: layer.id, name: layer.name, category: layer.category, feature_count: layer.feature_count, bounds: layer.bounds, asset_path: assetUrl, display_asset_path: display?.url ?? null, symbol_ids: layer.symbol_ids ?? null, sort_order: order, imported_at: index.exportedAt }), `Import layer ${layer.name}`);
  if (assetsOnly) {
    console.log(`Uploaded ${layer.name}.`);
    continue;
  }
  const data = JSON.parse(gunzipSync(compressed).toString('utf8'));
  // Bound batch size by both record count and payload bytes. Dense polygons
  // can be much larger than hundreds of small LSD polygons.
  let batch = [], bytes = 0, offset = 0;
  async function flush() {
    if (!batch.length) return;
    check(await supabase.rpc('import_map_features', { p_layer_id: layer.id, p_features: batch, p_offset: offset }), `Import features ${layer.name} from ${offset}`);
    offset += batch.length;
    batch = []; bytes = 0;
  }
  for (const feature of data.features) {
    const size = Buffer.byteLength(JSON.stringify(feature));
    if (batch.length >= 200 || (batch.length && bytes + size > 1_500_000)) await flush();
    batch.push(feature); bytes += size;
  }
  await flush();
  check(await supabase.from('map_features').delete().eq('layer_id', layer.id).gte('source_index', data.features.length), `Remove obsolete indices ${layer.name}`);
  console.log(`Imported ${layer.name}: ${data.features.length} features.`);
}
await upload('kebumen-mask.geojson.gz');
console.log(assetsOnly
  ? `Uploaded assets for ${index.layers.length} layers and the region mask.`
  : `Imported ${index.layers.length} layers, ${villages.length} villages and the region mask.`);
