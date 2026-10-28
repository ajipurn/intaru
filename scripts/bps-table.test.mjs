import test from 'node:test';
import assert from 'node:assert/strict';
import { bpsColumn, bpsNumber, bpsTableFromHtml } from './bps-table.mjs';

const table = {
  judul_tabel: 'Luas Daerah dan Jumlah Pulau Menurut Kecamatan di Kabupaten Kebumen, 2025',
  tahun_data: 2025,
  kolom: { abc: { nama_variabel: 'Luas Wilayah', satuan: 'km<sup>2</sup>' }, def: { nama_variabel: 'Jumlah Pulau' } },
  data: [
    { label: 'Ayah', label_raw: 'Ayah', kode_wilayah: 3305010, variables: { abc: { value_raw: '76,37' }, def: { value_raw: '1' } } },
    { label: 'Kebumen', label_raw: 'Kebumen', kode_wilayah: 3305000, variables: { abc: { value_raw: '1.281,12' }, def: { value_raw: '26' } } },
  ],
};
// The page splits an RSC payload, wrapped in other objects, across several script chunks.
const payload = `5:["$","$L21",null,{"data":{"status":"OK","data":[{"page":1},${JSON.stringify(table)}]}}]`;
const chunks = [payload.slice(0, 70), payload.slice(70)];
const html = `<html><script>self.__next_f.push([0])</script>${chunks.map((chunk) => `<script>self.__next_f.push([1,${JSON.stringify(chunk)}])</script>`).join('')}</html>`;

test('the table is recovered from the split Next.js payload', () => {
  assert.deepEqual(bpsTableFromHtml(html), table);
});

test('a page without a table explains the likely cause', () => {
  assert.throws(() => bpsTableFromHtml('<html>Gagal Memuat Tabel Statistik</html>'), /year parameter/);
});

test('Indonesian numbers use dots for thousands and a comma for decimals', () => {
  assert.equal(bpsNumber('1.281,12'), 1281.12);
  assert.equal(bpsNumber('76,37'), 76.37);
  assert.equal(bpsNumber('1'), 1);
});

test('a column is read by variable name with codes as strings', () => {
  assert.deepEqual(bpsColumn(table, 'Luas Wilayah'), [
    { code: '3305010', name: 'Ayah', value: 76.37 },
    { code: '3305000', name: 'Kebumen', value: 1281.12 },
  ]);
  assert.throws(() => bpsColumn(table, 'Kepadatan'), /no variable "Kepadatan"/);
});
