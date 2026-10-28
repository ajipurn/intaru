import type { MapSymbol } from './map-symbols.ts';

// Structure plan (struktur ruang) layers from the regency's Portal Tata Ruang.
// The portal publishes no terms of use; the UI and README attribute the owner.
export const TATARUANG_SOURCE = {
  label: 'Portal Tata Ruang Kabupaten Kebumen',
  publisher: 'Bidang Tata Ruang dan Pertanahan, DPUPR Kabupaten Kebumen',
  url: 'https://tataruang.kebumenkab.go.id/index.php/peta',
  geojsonUrl: (portalId: number) => `https://tataruang.kebumenkab.go.id/index.php/peta/geojson/struktur/${portalId}`,
};
export const TATARUANG_LAYER_PREFIX = 'tataruang-struktur-';

export type StructureLayer = {
  portalId: number;
  /** Official layer name; the catalogue and symbols are keyed by it. */
  name: string;
  label: string;
  kind: 'point' | 'line';
  /** One symbol per NAMOBJ value, labelled with that value. */
  symbols: MapSymbol[];
};

const slug = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const point = (label: string, color: string, radius = 5): MapSymbol => ({ id: slug(label), label, color, kind: 'point', radius });
const line = (label: string, color: string, dashArray?: string): MapSymbol => ({ id: slug(label), label, color, kind: 'line', dashArray });

// Colours group by system (energy red, water blue, telecommunication violet);
// point radius follows hierarchy, and secondary networks are dashed.
export const STRUCTURE_LAYERS: StructureLayer[] = [
  { portalId: 14, name: 'Sistem Infrastruktur Transportasi', label: 'Infrastruktur transportasi', kind: 'point', symbols: [
    point('Terminal Penumpang Tipe A', '#c2410c', 7),
    point('Terminal Penumpang Tipe C', '#fb923c', 5.5),
    point('Stasiun Penumpang', '#1d4ed8', 6),
    point('Stasiun Barang', '#1e3a8a', 6),
    point('Stasiun Operasi', '#3b82f6', 5),
    point('Pelabuhan Perikanan Pantai', '#155e75', 6.5),
    point('Pelabuhan Sungai dan Danau', '#0891b2', 5.5),
    point('Pangkalan Pendaratan Ikan', '#06b6d4', 5),
    point('Jembatan', '#57534e', 3.5),
  ] },
  { portalId: 3, name: 'Sistem Jaringan Energi', label: 'Jaringan energi', kind: 'line', symbols: [
    line('Saluran Udara Tegangan Ekstra Tinggi (SUTET)', '#7f1d1d'),
    line('Saluran Udara Tegangan Tinggi (SUTT)', '#ef4444', '8,4'),
    line('Jaringan yang Menyalurkan Minyak dan Gas Bumi dari Fasilitas Produksi-Tempat Penyimpanan', '#b45309', '2,4'),
  ] },
  { portalId: 1, name: 'Sistem Infrastruktur Energi', label: 'Infrastruktur energi', kind: 'point', symbols: [
    point('Pembangkit Listrik Tenaga Air (PLTA)', '#b91c1c', 7),
    point('Pembangkit Listrik Tenaga Mikro Hidro (PLTMH)', '#f87171', 5.5),
    point('Gardu Listrik', '#f59e0b', 6),
  ] },
  { portalId: 11, name: 'Sistem Jaringan Telekomunikasi', label: 'Jaringan telekomunikasi', kind: 'line', symbols: [
    line('Jaringan Tetap', '#c026d3', '6,4'),
  ] },
  { portalId: 8, name: 'Sistem Infrastruktur Telekomunikasi', label: 'Infrastruktur telekomunikasi', kind: 'point', symbols: [
    point('Jaringan Bergerak Seluler', '#a21caf', 4.5),
  ] },
  { portalId: 10, name: 'Sistem Jaringan Sumber Daya Air', label: 'Jaringan sumber daya air', kind: 'line', symbols: [
    line('Jaringan Irigasi Primer', '#1d4ed8'),
    line('Jaringan Irigasi Sekunder', '#38bdf8', '6,4'),
  ] },
  { portalId: 2, name: 'Sistem Infrastruktur Sumber Daya Air', label: 'Infrastruktur sumber daya air', kind: 'point', symbols: [
    point('Bangunan Sumber Daya Air', '#0369a1', 6),
  ] },
  { portalId: 9, name: 'Sistem Jaringan Prasarana Lainnya', label: 'Jaringan prasarana lainnya', kind: 'line', symbols: [
    line('Unit Distribusi', '#14b8a6'),
    line('Jaringan Drainase Primer', '#1e40af'),
    line('Jaringan Drainase Sekunder', '#60a5fa', '6,4'),
    line('Jalur Evakuasi Bencana', '#16a34a', '10,4'),
  ] },
  { portalId: 7, name: 'Sistem Infrastruktur Prasarana Lainnya', label: 'Infrastruktur prasarana lainnya', kind: 'point', symbols: [
    point('Unit Air Baku', '#0e7490', 5.5),
    point('Unit Produksi', '#1e40af', 5.5),
    point('Sumur Pompa', '#0d9488', 4.5),
    point('Sumur Dangkal', '#2dd4bf', 4),
    point('Infrastruktur Sistem Pengelolaan Air Limbah Domestik', '#78716c', 5),
    point('Infrastruktur Sistem Pengelolaan Air Limbah Non Domestik', '#44403c', 5),
    point('Sistem Pengelolaan Limbah Bahan Berbahaya dan Beracun (B3)', '#dc2626', 5.5),
    point('Tempat Penampungan Sementara (TPS)', '#ca8a04', 4.5),
    point('Tempat Pengelolaan Sampah Reuse, Reduce, Recycle (TPS3R)', '#84cc16', 5),
    point('Tempat Pengolahan Sampah Terpadu (TPST)', '#a16207', 6),
    point('Tempat Pemrosesan Akhir (TPA)', '#713f12', 7),
    point('Tempat Evakuasi Bencana', '#16a34a', 5.5),
  ] },
  { portalId: 13, name: 'Sistem Pusat Permukiman', label: 'Pusat permukiman', kind: 'point', symbols: [
    point('Pusat Kegiatan Wilayah (PKW)', '#1e1b4b', 10),
    point('Pusat Kegiatan Lokal (PKL)', '#3730a3', 8),
    point('Pusat Pelayanan Kawasan', '#6366f1', 6.5),
    point('Pusat Pelayanan Lingkungan', '#818cf8', 5),
  ] },
];

const byName = new Map(STRUCTURE_LAYERS.map((layer) => [layer.name, layer]));
export const structureLayer = (name: string) => byName.get(name);
export const structureLayerId = (portalId: number) => `${TATARUANG_LAYER_PREFIX}${portalId}`;
export const structureLayerFile = (layer: Pick<StructureLayer, 'name'>) => `geojson/strukturRuang-${slug(layer.name)}.geojson`;
