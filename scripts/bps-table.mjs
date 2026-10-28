// BPS statistic-table pages (kebumenkab.bps.go.id/id/statistics-table/...) render with
// Next.js and carry the whole table as JSON inside the self.__next_f payload chunks.

function closingBrace(text, start) {
  let depth = 0, inString = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === '\\') index++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return index;
  }
  return -1;
}

/** The table object: judul_tabel, tahun_data, kolom (variables by id), data (rows) and sumber. */
export function bpsTableFromHtml(html) {
  const text = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(([, chunk]) => JSON.parse(chunk)).join('');
  const key = text.indexOf('"judul_tabel"');
  if (key < 0) throw new Error('The page holds no BPS table; the year parameter may be missing.');
  // Walk outwards through the enclosing objects until one is the table itself.
  for (let start = text.lastIndexOf('{', key); start >= 0; start = text.lastIndexOf('{', start - 1)) {
    const end = closingBrace(text, start);
    if (end < key) continue;
    try {
      const table = JSON.parse(text.slice(start, end + 1));
      if (table.judul_tabel && table.kolom && Array.isArray(table.data)) return table;
    } catch {
      // Not a JSON object boundary; keep walking outwards.
    }
  }
  throw new Error('The BPS table payload could not be parsed.');
}

/** Indonesian number formatting: "1.281,12" is 1281.12. */
export const bpsNumber = (value) => Number(String(value).replace(/\./g, '').replace(',', '.'));

/** Values of one variable by row label, plus the regency total when the table has one. */
export function bpsColumn(table, variable) {
  const id = Object.entries(table.kolom).find(([, column]) => column.nama_variabel === variable)?.[0];
  if (!id) throw new Error(`"${table.judul_tabel}" has no variable "${variable}".`);
  return table.data.map((row) => ({ code: String(row.kode_wilayah), name: row.label_raw ?? row.label, value: bpsNumber(row.variables[id].value_raw) }));
}
