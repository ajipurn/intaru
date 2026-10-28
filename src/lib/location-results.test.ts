import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocationResults } from './location-results.ts';
import { TRANSPORT_LAYER } from './map-symbols.ts';
import type { LocationMatch } from '../types.ts';

const crop: LocationMatch = { layer_id: 'tanaman-pangan', layer_name: 'Kawasan Tanaman Pangan', properties: { NAMOBJ: 'Kawasan Tanaman Pangan', WADMKC: 'Kecamatan Kebumen' } };

test('reported location shows its area name and district exactly once', () => {
  const [result] = getLocationResults([crop]);
  assert.equal(result.title, 'Kawasan Tanaman Pangan');
  assert.equal(result.detail, undefined);
  assert.equal(result.district, 'Kecamatan Kebumen');
  assert.equal(result.symbol.color, '#C8F546');
  const [caseVariant] = getLocationResults([{ ...crop, properties: { NAMOBJ: ' KAWASAN_TANAMAN_PANGAN  ', WADMKC: 'Kebumen' } }]);
  assert.equal(caseVariant.detail, undefined);
});

test('district prefixes are normalized without changing the source properties', () => {
  for (const name of ['Kebumen', 'Kecamatan Kebumen', 'Kec. Kebumen', 'Kecamatan Kecamatan Kebumen', 'Kec.Kebumen']) {
    const properties = Object.freeze({ WADMKC: name });
    assert.equal(getLocationResults([{ ...crop, properties }])[0].district, 'Kecamatan Kebumen');
    assert.equal(properties.WADMKC, name);
  }
});

test('identical fragments merge while different districts and layers remain visible', () => {
  const results = getLocationResults([
    crop, { ...crop, properties: { NAMOBJ: 'Kawasan Tanaman Pangan', WADMKC: 'Kebumen' } },
    { ...crop, properties: { NAMOBJ: 'Kawasan Tanaman Pangan', WADMKC: 'Mirit' } },
    { ...crop, layer_id: 'another-layer' },
  ]);
  assert.equal(results.length, 3);
  assert.deepEqual(results.map((result) => result.district), ['Kecamatan Kebumen', 'Kecamatan Mirit', 'Kecamatan Kebumen']);
  assert.equal(new Set(results.map((result) => result.key)).size, 3);
});

test('district boundaries do not repeat their district as a second location line', () => {
  const [result] = getLocationResults([{ layer_id: 'districts', layer_name: 'Batas Kecamatan', properties: { KECAMATAN: 'Kebumen' } }], 'satellite');
  assert.equal(result.detail, 'Kecamatan Kebumen');
  assert.equal(result.district, undefined);
  assert.equal(result.symbol.kind, 'line');
  assert.equal(result.symbol.color, '#f8fafc');
});

test('village and district levels remain distinct even when they share a name', () => {
  const [result] = getLocationResults([{ layer_id: 'villages', layer_name: 'Batas Desa / Kelurahan', properties: { WADMKD: 'Kebumen', WADMKC: 'Kebumen' } }]);
  assert.equal(result.detail, 'Kebumen');
  assert.equal(result.district, 'Kecamatan Kebumen');
});

test('LP2B district aliases are included in location information', () => {
  const [result] = getLocationResults([{ layer_id: 'lp2b', layer_name: 'LP2B KEBUMEN 2026 WGS84', properties: { WADMKD: 'Wergonayan', WADMKC_1: 'Mirit' } }]);
  assert.equal(result.detail, 'Wergonayan');
  assert.equal(result.district, 'Kecamatan Mirit');
});

test('all risk descriptions are retained and distinct classifications are not merged', () => {
  const name = 'Rawan Bencana Tsunami Tingkat Tinggi, Rawan Bencana Tanah Longsor Tingkat Tinggi';
  const results = getLocationResults([
    { layer_id: 'risk', layer_name: 'Kawasan Rawan Bencana', properties: { KRB_03: name } },
    { layer_id: 'risk', layer_name: 'Kawasan Rawan Bencana', properties: { KRB_03: 'Rawan Bencana Banjir Tingkat Rendah' } },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].detail, name);
  assert.notEqual(results[0].symbol.id, results[1].symbol.id);
});

test('clicked transport and RPC matches share one result with the correct line symbol', () => {
  const road: LocationMatch = { layer_id: 'roads', layer_name: TRANSPORT_LAYER, properties: { NAMOBJ: 'Jalan Arteri Primer' } };
  const results = getLocationResults([road, { ...road }]);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Jaringan transportasi');
  assert.equal(results[0].detail, 'Jalan Arteri Primer');
  assert.equal(results[0].symbol.kind, 'line');
  assert.equal(results[0].symbol.color, '#FF5100');
});

test('missing properties do not create empty or repeated detail lines', () => {
  const [result] = getLocationResults([{ ...crop, properties: null }]);
  assert.equal(result.detail, undefined);
  assert.equal(result.district, undefined);
});
