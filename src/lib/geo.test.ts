import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsPoint, parseCoordinates, searchVillages } from './geo.ts';
import { featureColor } from './map-symbols.ts';
import type { Polygon } from 'geojson';

const polygon: Polygon = { type: 'Polygon', coordinates: [
  [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
  [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
] };
test('location inspection respects polygon holes, boundaries, and longitude/latitude order', () => {
  assert.equal(containsPoint(polygon, { lat: 2, lng: 8 }), true);
  assert.equal(containsPoint(polygon, { lat: 5, lng: 5 }), false);
  assert.equal(containsPoint(polygon, { lat: 0, lng: 5 }), true);
  assert.equal(containsPoint(polygon, { lat: 20, lng: 5 }), false);
  assert.equal(containsPoint({ type: 'MultiPolygon', coordinates: [polygon.coordinates] }, { lat: 2, lng: 8 }), true);
  assert.equal(containsPoint({ type: 'LineString', coordinates: [[0, 0], [10, 10]] }, { lat: 5, lng: 5 }), false);
  assert.equal(containsPoint(null, { lat: 0, lng: 0 }), false);
});
test('coordinates reject impossible values instead of swapping lat/lng', () => {
  assert.deepEqual(parseCoordinates('-7.6780, 109.6600'), { lat: -7.678, lng: 109.66 });
  assert.deepEqual(parseCoordinates('-7.6780; 109.6600'), { lat: -7.678, lng: 109.66 });
  assert.equal(parseCoordinates('109.6600, -7.6780'), null);
  assert.equal(parseCoordinates('-7.6780, 190'), null);
  assert.equal(parseCoordinates('Adiluhur'), null);
});
test('search distinguishes districts from villages and matches normalized names', () => {
  const villages = [{ DESAKEL: 'Adiluhur', KECAMATAN: 'Adimulyo' }, { DESAKEL: 'Adiluhur', KECAMATAN: 'Lainnya' }];
  assert.equal(searchVillages(villages, '  ADILUHUR ')[0].kind, 'village');
  assert.equal(searchVillages(villages, 'adiluhur').length, 2);
  assert.deepEqual(searchVillages(villages, 'adimulyo')[0], { kind: 'district', name: 'Adimulyo', district: 'Adimulyo' });
  assert.deepEqual(searchVillages(villages, 'x'), []);
});
test('risk colors distinguish disaster type and severity', () => {
  assert.notEqual(featureColor('Kawasan Rawan Bencana', { NAMOBJ: 'Banjir tingkat rendah' }), featureColor('Kawasan Rawan Bencana', { NAMOBJ: 'Banjir tingkat tinggi' }));
  assert.notEqual(featureColor('Kawasan Rawan Bencana', { NAMOBJ: 'Banjir tingkat tinggi' }), featureColor('Kawasan Rawan Bencana', { NAMOBJ: 'Tsunami tingkat tinggi' }));
});
