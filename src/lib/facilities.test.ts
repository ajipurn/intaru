import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFacility, dedupeFacilities, distanceMeters, formatDistance, nearestFacilities, overpassFilters } from './facilities.ts';
import type { FacilityFeature } from './facilities.ts';

test('OSM tags map to a category and an Indonesian label', () => {
  assert.deepEqual(classifyFacility({ amenity: 'hospital' }), { category: 'kesehatan', kind: 'Rumah sakit' });
  assert.deepEqual(classifyFacility({ healthcare: 'centre' }), { category: 'kesehatan', kind: 'Puskesmas' });
  assert.deepEqual(classifyFacility({ amenity: 'place_of_worship', religion: 'muslim' }), { category: 'ibadah', kind: 'Tempat ibadah' });
  assert.deepEqual(classifyFacility({ railway: 'station' }), { category: 'transportasi', kind: 'Stasiun kereta' });
  assert.equal(classifyFacility({ amenity: 'bench' }), null);
  assert.equal(classifyFacility({ amenity: 'toString' }), null);
});

test('community health centres tagged as hospitals keep the Puskesmas label', () => {
  assert.equal(classifyFacility({ amenity: 'hospital', name: 'PUSKESMAS SRUWENG' })?.kind, 'Puskesmas');
  assert.equal(classifyFacility({ amenity: 'hospital', name: 'RS PKU Muhammadiyah Petanahan' })?.kind, 'Rumah sakit');
});

test('amenity wins over a secondary healthcare tag', () => {
  assert.equal(classifyFacility({ amenity: 'pharmacy', healthcare: 'hospital' })?.kind, 'Apotek');
});

test('Overpass filters cover every classified tag key', () => {
  const filters = overpassFilters().join('');
  for (const key of ['amenity', 'healthcare', 'office', 'railway']) assert.match(filters, new RegExp(`\\["${key}"~`));
  assert.match(filters, /place_of_worship/);
});

test('distances use the great-circle formula', () => {
  // One degree of latitude is about 111.2 km.
  assert.ok(Math.abs(distanceMeters({ lat: -7, lng: 109 }, { lat: -8, lng: 109 }) - 111_195) < 50);
});

test('nearest facilities are filtered by radius, sorted, and limited', () => {
  const facility = (id: string, lat: number): FacilityFeature => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [109.66, lat] },
    properties: { id, name: id, category: 'pendidikan', kind: 'Sekolah', district: 'Kebumen' },
  });
  const features = [facility('far', -7.70), facility('near', -7.6801), facility('mid', -7.684)];
  const result = nearestFacilities(features, { lat: -7.68, lng: 109.66 }, 1000, 5);
  assert.deepEqual(result.map((item) => item.id), ['near', 'mid']);
  assert.equal(nearestFacilities(features, { lat: -7.68, lng: 109.66 }, 5000, 1).length, 1);
});

test('the same named facility mapped twice nearby is kept once', () => {
  const at = (id: string, name: string, lat: number, kind = 'Rumah sakit'): FacilityFeature => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [109.66, lat] },
    properties: { id, name, category: 'kesehatan', kind, district: 'Kebumen' },
  });
  const result = dedupeFacilities([
    at('node/1', 'Rumah Sakit Khusus Anak Wijayakusuma', -7.68),
    at('way/2', 'Rumah Sakit khusus anak wijaya kusuma', -7.6805),
    at('way/3', 'Rumah Sakit Khusus Anak Wijayakusuma', -7.70),
    at('node/4', 'Rumah Sakit Khusus Anak Wijayakusuma', -7.68, 'Apotek'),
    at('node/5', '', -7.68),
    at('node/6', '', -7.68),
  ]);
  assert.deepEqual(result.map((item) => item.properties.id), ['node/1', 'way/3', 'node/4', 'node/5', 'node/6']);
});

test('distances read naturally in Indonesian', () => {
  assert.equal(formatDistance(84), '80 m');
  assert.equal(formatDistance(1260), '1,3 km');
});
