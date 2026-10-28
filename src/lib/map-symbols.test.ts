import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { collectFeatureSymbols, featureName, featureSymbol, layerSymbols, RISK_LAYER, TRANSPORT_LAYER } from './map-symbols.ts';
import { layerStyle, symbolStyle } from './map-style.ts';
import type { Basemap } from './map-symbols.ts';
import type { DataIndex, GeoData } from '../types.ts';

test('actual KRB_03 values determine risk colours and keep every listed risk for inspection', () => {
  const properties = { KRB_03: 'Rawan Bencana Tsunami Tingkat Tinggi, Rawan Bencana Tanah Longsor Tingkat Tinggi', NAMOBJ: RISK_LAYER };
  assert.equal(featureSymbol(RISK_LAYER, properties).color, '#6d28a8');
  assert.equal(featureSymbol(RISK_LAYER, { KRB_03: 'Rawan Bencana Banjir Bandang Tingkat Rendah, Rawan Bencana Tsunami Tingkat Tinggi' }).color, '#f8c77a');
  assert.equal(featureSymbol(RISK_LAYER, { KRB_03: 'Rawan Bencana Gempa Bumi Tingkat Rendah' }).color, '#d1d5db');
  assert.equal(featureName(properties), properties.KRB_03);
  assert.equal(featureSymbol(RISK_LAYER, {}).id, 'unclassified');
  assert.equal(featureSymbol(RISK_LAYER, { KRB_03: 'Kategori baru' }).label, 'Klasifikasi belum tersedia');
});

test('boundary samples adapt to basemaps and transport samples use line symbols', () => {
  const district = { name: 'Batas Kecamatan', symbol_ids: ['Batas Kecamatan'] };
  assert.equal(layerSymbols(district, 'streets')[0].color, '#0f4c81');
  assert.equal(layerSymbols(district, 'satellite')[0].color, '#f8fafc');
  assert.equal(layerSymbols({ name: 'Batas Desa / Kelurahan' }, 'satellite')[0].dashArray, '3,4');
  for (const name of ['Jalan Lokal Primer', 'Jalan Arteri Primer', 'Jalan Kolektor Primer', 'Jalan Tol', 'Jaringan Jalur Kereta Api Antarkota']) {
    assert.equal(featureSymbol(TRANSPORT_LAYER, { NAMOBJ: name }).label, name);
    assert.equal(featureSymbol(TRANSPORT_LAYER, { NAMOBJ: name }).kind, 'line');
  }
});

test('every feature in all 29 layers retains its symbol after optimization and is represented by the legend', {
  skip: !existsSync('public/data/index.json') && 'Dataset is local-only; run pnpm data:export and pnpm data:prepare to audit all features.',
}, () => {
  const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as DataIndex;
  let featureCount = 0;
  assert.equal(index.layers.length, 29);
  for (const layer of index.layers) {
    const raw = JSON.parse(gunzipSync(readFileSync(`public${layer.asset_path}`)).toString('utf8')) as GeoData;
    const display = JSON.parse(gunzipSync(readFileSync(`public${layer.display_asset_path}`)).toString('utf8')) as GeoData;
    assert.equal(raw.features.length, display.features.length, layer.name);
    const sourceSymbols = collectFeatureSymbols(layer.name, raw.features);
    assert.ok(!sourceSymbols.some((symbol) => symbol.id === 'unclassified'), `${layer.name}: unexpected classification fallback`);
    assert.ok(sourceSymbols.every((symbol) => symbol.color.toLowerCase() !== '#64748b'), `${layer.name}: missing colour mapping`);
    assert.deepEqual(layer.symbol_ids, sourceSymbols.map((symbol) => symbol.id), `${layer.name}: stale legend metadata`);
    for (const base of ['streets', 'satellite', 'topography'] as Basemap[]) {
      const legend = collectFeatureSymbols(layer.name, display.features, base);
      assert.deepEqual(layerSymbols(layer, base), legend, `${layer.name}: sidebar/legend mismatch on ${base}`);
      const byId = new Map(legend.map((symbol) => [symbol.id, symbol]));
      for (let i = 0; i < raw.features.length; i++) {
        const before = featureSymbol(layer.name, raw.features[i].properties, base);
        const after = featureSymbol(layer.name, display.features[i].properties, base);
        assert.deepEqual(after, before, `${layer.name}: changed category on feature ${i}`);
        assert.equal(featureName(display.features[i].properties, layer.name), featureName(raw.features[i].properties, layer.name), `${layer.name}: changed inspection label on feature ${i}`);
        assert.deepEqual(after, byId.get(after.id), `${layer.name}: missing legend symbol on feature ${i}`);
        assert.deepEqual(layerStyle(layer, 65, base)(display.features[i]), symbolStyle(after, 65));
      }
    }
    featureCount += raw.features.length;
  }
  assert.equal(featureCount, 54886);
});
