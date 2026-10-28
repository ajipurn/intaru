import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { populationFromRows, readXlsxRows } from './population.mjs';

const header = { A: 'No', B: 'Indikator', E: 'Satuan', F: 2025 };
const total = { A: '1.', B: 'Jumlah Penduduk Per Kecamatan', F: '139.598' };

test('thousands separators read as decimals are restored and checked against the total', () => {
  const result = populationFromRows([
    header,
    total,
    { A: '1.1.', B: '(33.05.01) Kecamatan Ayah', F: 69.01000000000001 },
    { A: '1.2.', B: '(33.05.02) Kecamatan Buayan', F: 70.588 },
  ]);
  assert.equal(result.year, 2025);
  assert.deepEqual(result.districts, [
    { code: '33.05.01', name: 'Ayah', population: 69010 },
    { code: '33.05.02', name: 'Buayan', population: 70588 },
  ]);
});

test('whole numbers are kept as they are', () => {
  const result = populationFromRows([header, { ...total, F: 1500 }, { B: '(33.05.01) Kecamatan Ayah', F: 1500 }]);
  assert.equal(result.districts[0].population, 1500);
});

test('a mismatch with the published total fails loudly', () => {
  assert.throws(() => populationFromRows([header, total, { B: '(33.05.01) Kecamatan Ayah', F: 69.01 }]), /add up to 69010/);
});

test('worksheet cells resolve shared strings and numbers', () => {
  const workbook = zipSync({
    'xl/sharedStrings.xml': strToU8('<sst><si><t>Indikator</t></si><si><t>A &amp; B</t></si></sst>'),
    'xl/worksheets/sheet1.xml': strToU8('<worksheet><sheetData><row r="1"><c r="B1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c><c r="D1"/><c r="F1"><v>2025</v></c></row></sheetData></worksheet>'),
  });
  assert.deepEqual(readXlsxRows(workbook), [{ B: 'Indikator', C: 'A & B', D: '', F: 2025 }]);
});
