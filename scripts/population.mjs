import { strFromU8, unzipSync } from 'fflate';

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeXml = (value) => value.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => entities[name]);

/** First worksheet as rows keyed by column letter. Shared strings are resolved. */
export function readXlsxRows(buffer) {
  const names = ['xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml'];
  const files = unzipSync(new Uint8Array(buffer), { filter: (file) => names.includes(file.name) });
  if (!files[names[1]]) throw new Error('Workbook has no first worksheet.');
  const strings = [...strFromU8(files[names[0]] ?? new Uint8Array()).matchAll(/<si>(.*?)<\/si>/gs)]
    .map(([, item]) => decodeXml(item.replace(/<[^>]+>/g, '')));
  return [...strFromU8(files[names[1]]).matchAll(/<row\b[^>]*>(.*?)<\/row>/gs)].map(([, row]) => Object.fromEntries(
    [...row.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)].map(([, column, attributes, inner = '']) => {
      const value = inner.match(/<v>(.*?)<\/v>/s)?.[1];
      return [column, value === undefined ? '' : /\bt="s"/.test(attributes) ? strings[Number(value)] : Number(value)];
    }),
  ));
}

const digits = (value) => Number(String(value).replace(/\D/g, ''));

// The 2025 export stores "69.010" (Indonesian thousands separator) as the decimal 69.01.
// Recover whole people, then require the districts to add up to the published total.
function people(value) {
  if (typeof value === 'string') return digits(value);
  return Number.isInteger(value) && value >= 1000 ? value : Math.round(value * 1000);
}

/** Population per district from the Satu Data Kebumen indicator sheet. */
export function populationFromRows(rows) {
  const header = rows.find((row) => row.B === 'Indikator');
  const yearColumn = header && Object.keys(header).find((column) => /^\d{4}$/.test(String(header[column])));
  if (!yearColumn) throw new Error('Year column not found.');
  const districts = rows.flatMap((row) => {
    const match = String(row.B ?? '').match(/^\((\d{2}\.\d{2}\.\d{2})\)\s*Kecamatan\s+(.+)$/);
    return match ? [{ code: match[1], name: match[2].trim(), population: people(row[yearColumn]) }] : [];
  });
  const totalRow = rows.find((row) => /^Jumlah Penduduk/i.test(String(row.B ?? '')) && row[yearColumn] !== '');
  if (!districts.length || !totalRow) throw new Error('District rows or total row not found.');
  const total = people(totalRow[yearColumn]);
  const sum = districts.reduce((value, district) => value + district.population, 0);
  if (sum !== total) throw new Error(`District populations add up to ${sum}, but the sheet total is ${total}.`);
  return { year: Number(header[yearColumn]), total, districts };
}
