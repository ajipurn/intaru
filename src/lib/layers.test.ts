import test from 'node:test';
import assert from 'node:assert/strict';
import { groupLayers, isAreaLayer, pickLayers, toggleLayerIds } from './layers.ts';
import type { Layer } from '../types.ts';

const layer = (id: string, category: string): Layer => ({ id, name: id, category, asset_path: `/${id}`, feature_count: 1, bounds: null });
const catalog = [layer('lsd', 'lsd'), layer('mangrove', 'pola-ruang'), layer('lp2b', 'lp2b'), layer('kecamatan', 'administrasi')];

test('groups follow the sidebar order and merge LSD with LP2B', () => {
  const groups = groupLayers(catalog);
  assert.deepEqual(groups.map((group) => group.id), ['pola-ruang', 'pertanian', 'administrasi']);
  assert.deepEqual(groups[1].layers.map((item) => item.id), ['lsd', 'lp2b']);
  assert.equal(groups[2].defaultOpen, true);
});

test('selected layers follow the sidebar groups, then catalogue order, and skip unknown IDs', () => {
  assert.deepEqual(pickLayers(catalog, ['kecamatan', 'missing', 'lsd']).map((item) => item.id), ['lsd', 'kecamatan']);
  const appended = [...catalog, layer('energi', 'strukturRuang'), layer('roads', 'strukturRuang'), layer('unknown', 'new-source')];
  assert.deepEqual(pickLayers(appended, ['unknown', 'energi', 'kecamatan', 'roads', 'mangrove']).map((item) => item.id), ['mangrove', 'energi', 'roads', 'kecamatan', 'unknown']);
});

test('toggling adds without duplicates and removes every given ID', () => {
  assert.deepEqual(toggleLayerIds(['a', 'b'], ['b', 'c'], true), ['a', 'b', 'c']);
  assert.deepEqual(toggleLayerIds(['a', 'b', 'c'], ['a', 'c'], false), ['b']);
});

test('only boundaries and structure networks are drawn without area opacity', () => {
  assert.equal(isAreaLayer({ category: 'pola-ruang' }), true);
  assert.equal(isAreaLayer({ category: 'administrasi' }), false);
  assert.equal(isAreaLayer({ category: 'strukturRuang' }), false);
});
