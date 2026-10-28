import test from 'node:test';
import assert from 'node:assert/strict';
import { HAZARDS, hazardById, hazardTileUrl, tileBounds } from './hazards.ts';

test('tile bounds follow the XYZ Web Mercator grid', () => {
  const world = 20037508.342789244;
  assert.deepEqual(tileBounds(0, 0, 0), [-world, -world, world, world]);
  const [xmin, ymin, xmax, ymax] = tileBounds(1, 1, 1);
  assert.deepEqual([xmin, ymin, xmax, ymax], [0, -world, world, 0]);
});

test('a tile URL asks the image service for a transparent PNG of that tile', () => {
  const url = new URL(hazardTileUrl(HAZARDS[0], 3, 4, 3));
  assert.match(url.pathname, /\/inarisk\/layer_bahaya_banjir\/ImageServer\/exportImage$/);
  assert.equal(url.searchParams.get('bboxSR'), '3857');
  assert.equal(url.searchParams.get('transparent'), 'true');
  assert.equal(url.searchParams.get('bbox')?.split(',').length, 4);
});

test('unknown hazard IDs resolve to none', () => {
  assert.equal(hazardById('tsunami')?.label, 'Tsunami');
  assert.equal(hazardById('gempa'), null);
  assert.equal(hazardById(null), null);
});
