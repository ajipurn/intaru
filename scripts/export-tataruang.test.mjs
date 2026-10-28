import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStructureConfig, planarGeometry, sourceYear } from './export-tataruang.mjs';

test('portal points lose their Z and M values while lines keep their positions', () => {
  assert.deepEqual(planarGeometry({ type: 'Point', coordinates: [109.7795, -7.6094, 0, -1.7976931348623157e+308] }), { type: 'Point', coordinates: [109.7795, -7.6094] });
  const line = { type: 'MultiLineString', coordinates: [[[109.7, -7.7], [109.8, -7.8]]] };
  assert.deepEqual(planarGeometry(line), line);
  assert.equal(planarGeometry(null), null);
});

test('source notes resolve to their latest year that is not in the future', () => {
  assert.equal(sourceYear('Kementerian ESDM, 2022', 2026), 2022);
  assert.equal(sourceYear('Kepmen ESDM Nomor 188.K/HK.02/MEM.L/2021', 2026), 2021);
  assert.equal(sourceYear('Perda Nomor 16 Tahun 2019 tentang RTRW Provinsi Jawa Tengah Tahun 2009-2029', 2026), 2019);
  assert.equal(sourceYear('Tidak ada', 2026), null);
});

test('portal layer titles are read from the map page configuration', () => {
  const html = '<script>var strukturConfig = [{"id":"1","judul":"Sistem Infrastruktur Energi","url":"x"},{"id":"14","judul":"Sistem Infrastruktur Transportasi","url":"y"}];</script>';
  assert.deepEqual([...parseStructureConfig(html)], [[1, 'Sistem Infrastruktur Energi'], [14, 'Sistem Infrastruktur Transportasi']]);
  assert.throws(() => parseStructureConfig('<html></html>'), /strukturConfig/);
});
