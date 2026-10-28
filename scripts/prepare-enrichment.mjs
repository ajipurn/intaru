import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { classifyFacility, dedupeFacilities } from '../src/lib/facilities.ts';
import { containsPoint, normalize } from '../src/lib/geo.ts';
import { populationFromRows, readXlsxRows } from './population.mjs';

const RAW = 'data/enrichment';
const OUTPUT = 'public/data/enrichment';
const exists = (path) => access(path).then(() => true, () => false);

if (!(await exists(join(RAW, 'manifest.json')))) {
  if (await exists(join(OUTPUT, 'population.json'))) {
    console.log('Enrichment sources are not exported locally; keeping the prepared files.');
    process.exit(0);
  }
  throw new Error('Enrichment sources are missing; run pnpm data:enrich.');
}
const manifest = JSON.parse(await readFile(join(RAW, 'manifest.json'), 'utf8'));
function source(file) {
  const resource = manifest.resources.find((item) => item.file === file);
  if (!resource) throw new Error(`${file} is missing from ${RAW}/manifest.json; run pnpm data:enrich.`);
  return resource;
}
const readBoundary = async (file) => JSON.parse(gunzipSync(await readFile(join('public/data/geojson', file)))).features;
const districts = await readBoundary('batas-kecamatan.geojson.gz');
const villages = await readBoundary('batas-desa.geojson.gz');
await mkdir(OUTPUT, { recursive: true });

// Population. BPS and Kemendagri codes differ, so each Kemendagri code is checked
// against the district named for it in the village boundaries before matching by name.
const populationSource = source('penduduk-kecamatan.xlsx');
const { year, districts: rows } = populationFromRows(readXlsxRows(await readFile(join(RAW, populationSource.file))));
const districtByCode = new Map(villages.map(({ properties }) => [properties.KDCPUM, normalize(properties.WADMKC)]));
const boundaryName = new Map(districts.map(({ properties }) => [normalize(properties.KECAMATAN), properties.KECAMATAN]));
// Shown on the map, so use the agency's common short name.
const publisher = populationSource.publisher === 'Dinas Kependudukan dan Pencatatan Sipil' ? 'Disdukcapil Kabupaten Kebumen' : populationSource.publisher;
const population = rows.map((row) => {
  const name = normalize(row.name);
  if (districtByCode.get(row.code) !== name) {
    throw new Error(`${row.code} is "${districtByCode.get(row.code) ?? 'unknown'}" in the village boundaries, not "${row.name}".`);
  }
  if (!boundaryName.has(name)) throw new Error(`${row.name} has no district boundary.`);
  return {
    code: row.code,
    district: boundaryName.get(name),
    year,
    population: row.population,
    publisher,
    source_url: populationSource.source,
    retrieved_at: populationSource.retrievedAt,
  };
});
if (population.length !== districts.length) throw new Error(`Population covers ${population.length} of ${districts.length} districts.`);
await writeFile(join(OUTPUT, 'population.json'), JSON.stringify(population) + '\n');

// Facilities, clipped to the regency and tagged with their district.
const facilitySource = source('osm-facilities.json.gz');
const osm = JSON.parse(gunzipSync(await readFile(join(RAW, facilitySource.file))));
const boxes = districts.map((feature) => {
  const positions = JSON.stringify(feature.geometry.coordinates).match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g).map((pair) => pair.split(',').map(Number));
  const lngs = positions.map(([lng]) => lng), lats = positions.map(([, lat]) => lat);
  return { feature, west: Math.min(...lngs), east: Math.max(...lngs), south: Math.min(...lats), north: Math.max(...lats) };
});
const round = (value) => Math.round(value * 1e7) / 1e7;
const features = [];
for (const element of osm.elements) {
  const type = classifyFacility(element.tags ?? {});
  const lat = element.lat ?? element.center?.lat, lng = element.lon ?? element.center?.lon;
  if (!type || lat === undefined || lng === undefined) continue;
  const point = { lat, lng };
  const district = boxes.find((box) => lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north && containsPoint(box.feature.geometry, point));
  if (!district) continue;
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(lng), round(lat)] },
    properties: { id: `${element.type}/${element.id}`, name: (element.tags.name ?? '').trim(), ...type, district: district.feature.properties.KECAMATAN },
  });
}
features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
const unique = dedupeFacilities(features);
const facilities = {
  type: 'FeatureCollection',
  metadata: {
    attribution: '© kontributor OpenStreetMap',
    license: facilitySource.license,
    source: facilitySource.source,
    osmTimestamp: facilitySource.osmTimestamp,
    retrievedAt: facilitySource.retrievedAt,
  },
  features: unique,
};
await writeFile(join(OUTPUT, 'facilities.geojson.gz'), gzipSync(JSON.stringify(facilities)));

const byCategory = Object.entries(Object.groupBy(unique, (feature) => feature.properties.category)).map(([category, items]) => `${category} ${items.length}`);
console.log(`Prepared population for ${population.length} districts (${year}) and ${unique.length} facilities (${features.length - unique.length} duplicates removed): ${byCategory.join(', ')}.`);
