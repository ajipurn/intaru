import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. Never use a VITE_ prefix for the service role key.');
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
function check(result, context) { if (result.error) throw new Error(`${context}: ${result.error.message}`); return result.data; }

// Requires supabase/migrations/202610280001_enrichment.sql.
const population = JSON.parse(await readFile('public/data/enrichment/population.json', 'utf8'));
check(await supabase.from('district_population').upsert(population), 'Import district population');

const { features } = JSON.parse(gunzipSync(await readFile('public/data/enrichment/facilities.geojson.gz')));
const rows = features.map(({ geometry, properties }) => ({ ...properties, geom: `SRID=4326;POINT(${geometry.coordinates.join(' ')})` }));
for (let offset = 0; offset < rows.length; offset += 1000) {
  check(await supabase.from('facilities').upsert(rows.slice(offset, offset + 1000)), `Import facilities from ${offset}`);
}
// Remove facilities that disappeared from the latest OpenStreetMap export.
const current = new Set(rows.map((row) => row.id));
const stored = check(await supabase.from('facilities').select('id').limit(100_000), 'Read stored facilities');
const obsolete = stored.map((row) => row.id).filter((id) => !current.has(id));
for (let offset = 0; offset < obsolete.length; offset += 500) {
  check(await supabase.from('facilities').delete().in('id', obsolete.slice(offset, offset + 500)), 'Remove obsolete facilities');
}
console.log(`Imported population for ${population.length} districts and ${rows.length} facilities (${obsolete.length} removed).`);
