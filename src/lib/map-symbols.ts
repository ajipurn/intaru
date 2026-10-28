import type { Feature, GeoJsonProperties } from 'geojson';
import type { Layer } from '../types.ts';
import { structureLayer } from './structure-layers.ts';

export const BASEMAP_IDS = ['streets', 'satellite', 'topography'] as const;
export type Basemap = (typeof BASEMAP_IDS)[number];
export type MapSymbol = { id: string; label: string; color: string; kind: 'area' | 'line' | 'point'; dashArray?: string; haloColor?: string; radius?: number };
export const RISK_LAYER = 'Kawasan Rawan Bencana';
export const TRANSPORT_LAYER = 'SISTEM JARINGAN TRANSPORTASI LN';
export const DISTRICT_LAYER = 'Batas Kecamatan';
export const VILLAGE_LAYER = 'Batas Desa / Kelurahan';
export const DISPLAY_PROPERTY_FIELDS = ['NAMOBJ', 'Nama_Objek', 'NAMA_OBJEK', 'NAMOBJEK', 'KRB_03', 'KRB03', 'KRB', 'KKOP_1', 'KSMPDN', 'KKARST', 'PTBGMB', 'RESAIR', 'KP2B_2', 'LP2B_FINAL', 'WADMKC_1', 'REMARK', 'JNS_RNCN_P', 'WADMKD', 'WADMKC', 'KECAMATAN', 'DESAKEL'];

const colors: Record<string, string> = {
  'Badan Air': '#97DBF2', 'Kawasan Ekosistem Mangrove': '#2D966E',
  'Kawasan Hutan Lindung': '#325F28', 'Kawasan Hutan Produksi Terbatas': '#4B9B37',
  'Kawasan Hutan Produksi Tetap': '#69B437', 'Kawasan Keunikan Batuan dan Fosil': '#968796',
  'Kawasan Pariwisata': '#FFA5FF', 'Kawasan Pembangkitan Tenaga Listrik': '#00CFAB',
  'Kawasan Perikanan Budi Daya': '#82B9D2', 'Kawasan Perkebunan Rakyat': '#9BDC9B',
  'Kawasan Permukiman Perdesaan': '#EB9B3C', 'Kawasan Permukiman Perkotaan': '#F59B1E',
  'Kawasan Pertahanan dan Keamanan': '#9B00FF', 'Kawasan Peruntukan Industri': '#690000',
  'Kawasan Tanaman Pangan': '#C8F546', 'Taman Pulau Kecil': '#C8F0E6',
  'Kawasan Peruntukan Pertambangan Batuan': '#5F7391', 'Kawasan Karst': '#8B5E3C',
  'Kawasan Keselamatan Operasi Penerbangan': '#E91E63', 'Kawasan Pertambangan Mineral dan Batubara': '#6B7280',
  'Kawasan Resapan Air': '#0F766E', 'Kawasan Sempadan': '#2563EB',
  'KP2B': '#65A30D', 'SHP LSD': '#22C55E', 'LP2B KEBUMEN 2026 WGS84': '#F59E0B',
  'Batas Desa / Kelurahan': '#8e44ad', 'Batas Kecamatan': '#0f4c81',
  'SISTEM JARINGAN TRANSPORTASI LN': '#FF8C00',
};
export const layerColor = (name: string) => colors[name] ?? '#64748B';
export function displayLayerName(name: string) {
  return structureLayer(name)?.label ?? ({ 'SHP LSD': 'Lahan Sawah Dilindungi (LSD)', 'LP2B KEBUMEN 2026 WGS84': 'Lahan Pertanian Pangan Berkelanjutan (LP2B)', 'SISTEM JARINGAN TRANSPORTASI LN': 'Jaringan transportasi' })[name] ?? name;
}

const riskTypes = [
  { id: 'flood', label: 'Banjir', pattern: /banjir/i, colors: ['#8fd3e6', '#168aad', '#0b5f78'] },
  { id: 'flash-flood', label: 'Banjir bandang', pattern: /banjir bandang/i, colors: ['#f8c77a', '#f59e0b', '#c2410c'] },
  { id: 'tsunami', label: 'Tsunami', pattern: /tsunami/i, colors: ['#d8b4e8', '#a855c7', '#6d28a8'] },
  { id: 'landslide', label: 'Tanah longsor', pattern: /longsor/i, colors: ['#c9a27e', '#b7793c', '#7c2d12'] },
  { id: 'earthquake', label: 'Gempa bumi', pattern: /gempa/i, colors: ['#d1d5db', '#6b7280', '#374151'] },
];
const levels = ['Rendah', 'Sedang', 'Tinggi'];
const riskSymbols: MapSymbol[] = riskTypes.flatMap((type) => levels.map((level, index) => ({
  id: `risk-${type.id}-${level.toLowerCase()}`, label: `${type.label} · ${level.toLowerCase()}`, color: type.colors[index], kind: 'area',
})));
const roadSymbols: MapSymbol[] = [
  { id: 'road-arterial', label: 'Jalan Arteri Primer', color: '#FF5100', kind: 'line' },
  { id: 'road-collector', label: 'Jalan Kolektor Primer', color: '#FF8C00', kind: 'line' },
  { id: 'road-local', label: 'Jalan Lokal Primer', color: '#9B5AFF', kind: 'line' },
  { id: 'road-toll', label: 'Jalan Tol', color: '#FF8C00', kind: 'line' },
  { id: 'rail', label: 'Jaringan Jalur Kereta Api Antarkota', color: '#FF8C00', kind: 'line' },
];
function unknownSymbol(kind: MapSymbol['kind']): MapSymbol {
  return { id: 'unclassified', label: 'Klasifikasi belum tersedia', color: '#64748b', kind };
}
function boundary(name: string) { return name === DISTRICT_LAYER || name === VILLAGE_LAYER; }
/** Point and line networks of the structure plan, identified by clicking the feature itself. */
export const isStructureLayer = (name: string) => name === TRANSPORT_LAYER || Boolean(structureLayer(name));
const matchKey = (value: unknown) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
export function symbolCatalog(name: string, base: Basemap = 'streets'): MapSymbol[] {
  if (name === RISK_LAYER) return [...riskSymbols, unknownSymbol('area')];
  if (name === TRANSPORT_LAYER) return [...roadSymbols, unknownSymbol('line')];
  const structure = structureLayer(name);
  if (structure) return [...structure.symbols, unknownSymbol(structure.kind)];
  const isBoundary = boundary(name);
  const village = name === VILLAGE_LAYER;
  return [{ id: name, label: displayLayerName(name), color: isBoundary && base === 'satellite' ? village ? '#fde68a' : '#f8fafc' : layerColor(name),
    kind: isBoundary ? 'line' : 'area', dashArray: village ? '3,4' : undefined, haloColor: isBoundary && base === 'satellite' ? '#10251b' : undefined }];
}

export function featureName(properties: GeoJsonProperties, fallback = '') {
  for (const key of ['KRB_03', 'KRB03', 'KRB', 'NAMOBJ', 'Nama_Objek', 'NAMA_OBJEK', 'NAMOBJEK', 'KKOP_1', 'KSMPDN', 'LP2B_FINAL', 'WADMKD', 'REMARK', 'JNS_RNCN_P']) {
    const value = String(properties?.[key] ?? '').trim();
    if (value && !/^(tidak ada|ada)$/i.test(value)) return value;
  }
  return fallback;
}

export function featureSymbol(name: string, properties: GeoJsonProperties, base: Basemap = 'streets'): MapSymbol {
  if (name === RISK_LAYER) {
    // A feature can list several risks. Match the source renderer: the first
    // listed risk determines its colour; inspection retains the complete text.
    const first = featureName(properties).replace(/_/g, ' ').split(',')[0];
    const type = /banjir bandang/i.test(first) ? riskTypes[1] : riskTypes.find((item) => item.pattern.test(first));
    const level = first.match(/tingkat\s+(rendah|sedang|tinggi)/i)?.[1].toLowerCase();
    return riskSymbols.find((symbol) => symbol.id === `risk-${type?.id}-${level}`) ?? unknownSymbol('area');
  }
  if (name === TRANSPORT_LAYER) {
    const value = featureName(properties);
    const id = /arteri/i.test(value) ? 'road-arterial' : /kolektor/i.test(value) ? 'road-collector' : /lokal/i.test(value) ? 'road-local' : /jalan tol/i.test(value) ? 'road-toll' : /kereta api/i.test(value) ? 'rail' : 'unclassified';
    return roadSymbols.find((symbol) => symbol.id === id) ?? unknownSymbol('line');
  }
  const structure = structureLayer(name);
  if (structure) {
    // Portal categories are the RTRW object names in NAMOBJ.
    const key = matchKey(properties?.NAMOBJ);
    return structure.symbols.find((symbol) => matchKey(symbol.label) === key) ?? unknownSymbol(structure.kind);
  }
  return symbolCatalog(name, base)[0];
}
export function featureColor(name: string, properties: GeoJsonProperties) { return featureSymbol(name, properties).color; }

export function collectFeatureSymbols(name: string, features: Feature[], base: Basemap = 'streets'): MapSymbol[] {
  const ids = new Set(features.map((feature) => featureSymbol(name, feature.properties, base).id));
  return symbolCatalog(name, base).filter((symbol) => ids.has(symbol.id));
}
export function layerSymbols(layer: Pick<Layer, 'name' | 'symbol_ids'>, base: Basemap = 'streets'): MapSymbol[] {
  const catalog = symbolCatalog(layer.name, base);
  if (!layer.symbol_ids) return catalog.filter((symbol) => symbol.id !== 'unclassified');
  const ids = new Set(layer.symbol_ids);
  return catalog.filter((symbol) => ids.has(symbol.id));
}
