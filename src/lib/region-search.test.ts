import test from 'node:test';
import assert from 'node:assert/strict';
import { findRegionFeatures, regionLayerName } from './region-search.ts';
import type { GeoData } from '../types.ts';

const feature = (properties: Record<string, string>) => ({ type: 'Feature' as const, properties, geometry: null as never });
const data: GeoData = {
  type: 'FeatureCollection',
  features: [
    feature({ WADMKC: 'Adimulyo', WADMKD: 'Adiluhur' }),
    feature({ WADMKC: 'Adimulyo', WADMKD: 'Arjomulyo' }),
    feature({ KECAMATAN: 'Kebumen', DESAKEL: 'Adiluhur' }),
  ],
};

test('search results map to their boundary layer', () => {
  assert.equal(regionLayerName('district'), 'Batas Kecamatan');
  assert.equal(regionLayerName('village'), 'Batas Desa / Kelurahan');
});

test('a district matches every feature inside it, ignoring case and spacing', () => {
  assert.equal(findRegionFeatures(data, { kind: 'district', name: 'Adimulyo', district: ' adimulyo ' }).length, 2);
});

test('a village matches by name within its own district only', () => {
  const [match] = findRegionFeatures(data, { kind: 'village', name: 'ADILUHUR', district: 'Kebumen' });
  assert.equal(match.properties?.DESAKEL, 'Adiluhur');
  assert.equal(findRegionFeatures(data, { kind: 'village', name: 'Arjomulyo', district: 'Kebumen' }).length, 0);
});
