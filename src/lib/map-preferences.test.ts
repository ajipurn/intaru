import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMapPreferences, MAP_PREFERENCES_KEY, parseMapPreferences, readMapPreferences, sameViewport, writeMapPreferences } from './map-preferences.ts';

// Refresh must restore the whole map session, including deliberately empty filters.
test('map preferences survive a storage round trip without losing empty layers or false values', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const preferences = {
    ...defaultMapPreferences(), layers: [], basemap: 'satellite' as const,
    opacity: 42, inspect: false, legendOpen: true,
    viewport: { lat: -7.623, lng: 109.541, zoom: 12.4 },
  };
  assert.equal(writeMapPreferences(preferences, storage), true);
  assert.ok(values.has(MAP_PREFERENCES_KEY));
  assert.deepEqual(readMapPreferences(storage), preferences);
});

test('invalid storage and unsupported versions fall back to the default region view', () => {
  for (const value of [null, '', 'broken JSON', 'null', '[]', '{"version":2}', '{"version":"1"}']) {
    assert.deepEqual(parseMapPreferences(value), defaultMapPreferences());
  }
});

test('valid saved fields are recovered independently and layers are deduplicated', () => {
  const parsed = parseMapPreferences(JSON.stringify({
    version: 1, layers: ['rawan-bencana', 'rawan-bencana'], basemap: 'topography',
    opacity: 101, inspect: false, legendOpen: 'yes', viewport: { lat: -7.6, lng: 109.6, zoom: 11.7 },
  }));
  assert.deepEqual(parsed.layers, ['rawan-bencana']);
  assert.equal(parsed.basemap, 'topography');
  assert.equal(parsed.opacity, 65);
  assert.equal(parsed.inspect, false);
  assert.equal(parsed.legendOpen, false);
  assert.deepEqual(parsed.viewport, { lat: -7.6, lng: 109.6, zoom: 11.7 });
});

test('corrupt viewport, layers, and basemap never reach the map', () => {
  for (const viewport of [
    { lat: 'x', lng: 109, zoom: 11 }, { lat: 91, lng: 109, zoom: 11 },
    { lat: -7, lng: 181, zoom: 11 }, { lat: -7, lng: 109, zoom: 4 },
    { lat: -7, lng: 109, zoom: 20 }, {}, [],
  ]) {
    const parsed = parseMapPreferences(JSON.stringify({ version: 1, layers: ['okay', null], basemap: '__proto__', viewport }));
    assert.equal(parsed.viewport, null);
    assert.deepEqual(parsed.layers, ['batas-kecamatan']);
    assert.equal(parsed.basemap, 'streets');
  }
});

test('denied browser storage does not break map interactions', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(readMapPreferences(storage), defaultMapPreferences());
  assert.equal(writeMapPreferences(defaultMapPreferences(), storage), false);
});

test('only known hazard overlays are restored', () => {
  assert.equal(parseMapPreferences(JSON.stringify({ version: 1, hazard: 'tsunami' })).hazard, 'tsunami');
  assert.equal(parseMapPreferences(JSON.stringify({ version: 1, hazard: 'gempa' })).hazard, null);
  assert.equal(parseMapPreferences(JSON.stringify({ version: 1 })).hazard, null);
});

test('viewport equality avoids duplicate writes from moveend and zoomend', () => {
  assert.equal(sameViewport({ lat: -7.6, lng: 109.5, zoom: 12 }, { lat: -7.6, lng: 109.5, zoom: 12 }), true);
  assert.equal(sameViewport(null, null), true);
  assert.equal(sameViewport(null, { lat: -7.6, lng: 109.5, zoom: 12 }), false);
  assert.equal(sameViewport({ lat: -7.6, lng: 109.5, zoom: 12 }, { lat: -7.6, lng: 109.5, zoom: 12.5 }), false);
});
