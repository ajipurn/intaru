import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asGeoJSON, parseResponse, summarizeGeometry } from './export-apps-script.mjs';

test('Apps Script response decoding handles the XSSI prefix and nested JSON', () => {
  const response = ")]}'\n\n" + JSON.stringify([['op.exec', [0, JSON.stringify({ polaRuang: [] })]], ['di', 100]]);
  assert.deepEqual(parseResponse(response), { polaRuang: [] });
  assert.throws(() => parseResponse(JSON.stringify([['op.exec', null, ['failed']]])), /successful/);
});
test('LSD GeometryCollection becomes separate features without losing coordinates', () => {
  const geometry = { type: 'Polygon', coordinates: [[[109, -7], [110, -7], [109, -8], [109, -7]]] };
  const normalized = asGeoJSON(JSON.stringify({ type: 'GeometryCollection', geometries: [geometry, geometry] }));
  assert.equal(normalized.features.length, 2);
  assert.deepEqual(normalized.features[0].geometry, geometry);
  assert.deepEqual(summarizeGeometry(normalized).bounds, [109, -8, 110, -7]);
  assert.equal(summarizeGeometry(normalized).positions, 8);
  assert.throws(() => asGeoJSON({ error: 'missing' }), /FeatureCollection/);
});
