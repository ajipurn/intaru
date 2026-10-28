import test from 'node:test';
import assert from 'node:assert/strict';
import { displayGeometry } from './display-geometry.mjs';

test('display simplification preserves source, features, holes, names and colours', () => {
  const outer = [[0,0], [.1,0], [.2,0], [1,0], [1,1], [0,1], [0,0]];
  const hole = [[.2,.2], [.4,.2], [.4,.4], [.2,.4], [.2,.2]];
  const input = { type: 'FeatureCollection', features: [{ type: 'Feature', id: 7, properties: { KRB_03: 'Rawan Bencana Tsunami Tingkat Tinggi', NAMOBJ: 'Banjir tinggi', KKOP_1: 'Kawasan penerbangan', KSMPDN: 'Sempadan Sungai', WADMKD: 'Desa', SECRETARY: 'Public source metadata' }, geometry: { type: 'Polygon', coordinates: [outer, hole] } }] };
  const before = structuredClone(input);
  const display = displayGeometry(input);
  assert.deepEqual(input, before);
  assert.equal(display.features.length, 1);
  assert.equal(display.features[0].id, 7);
  assert.equal(display.features[0].geometry.coordinates.length, 2);
  assert.equal(display.features[0].properties.NAMOBJ, 'Banjir tinggi');
  assert.equal(display.features[0].properties.WADMKD, 'Desa');
  for (const key of ['KRB_03', 'KKOP_1', 'KSMPDN']) assert.equal(display.features[0].properties[key], input.features[0].properties[key]);
  assert.ok(display.features[0].geometry.coordinates[0].length < outer.length);
  for (const ring of display.features[0].geometry.coordinates) {
    assert.ok(ring.length >= 4);
    assert.deepEqual(ring[0], ring.at(-1));
  }
});

test('tiny polygons remain distinct when display coordinates are rounded', () => {
  const ring = [[109,-7], [109.00000001,-7], [109.00000001,-7.00000001], [109,-7]];
  const input = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] };
  const display = displayGeometry(input);
  assert.ok(new Set(display.features[0].geometry.coordinates[0].map((point) => point.join(','))).size >= 3);
});
