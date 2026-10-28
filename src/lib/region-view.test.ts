import test from 'node:test';
import assert from 'node:assert/strict';
import { regionRings } from './region-view.ts';

const world = [[-360, -85], [360, -85], [360, 85], [-360, 85], [-360, -85]];
const kebumen = [[109.4, -7.8], [109.8, -7.8], [109.8, -7.5], [109.4, -7.8]];
const islet = [[109.5, -7.82], [109.51, -7.82], [109.51, -7.81], [109.5, -7.82]];

test('region rings are the holes of the exterior mask, not the world ring', () => {
  const mask = {
    type: 'FeatureCollection' as const,
    features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [world, kebumen, islet] } }],
  };
  assert.deepEqual(regionRings(mask), [kebumen, islet]);
});

test('region rings collect holes from every part of a multipolygon mask', () => {
  const mask = {
    type: 'FeatureCollection' as const,
    features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiPolygon' as const, coordinates: [[world, kebumen], [world, islet]] } }],
  };
  assert.deepEqual(regionRings(mask), [kebumen, islet]);
});
