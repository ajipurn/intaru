import type { Layer } from '../types.ts';

export const ADMIN_CATEGORY = 'administrasi';
export const TRANSPORT_CATEGORY = 'strukturRuang';

export type LayerGroup = { id: string; label: string; description: string; categories: string[]; defaultOpen?: boolean };
export type GroupedLayers = LayerGroup & { layers: Layer[] };

export const LAYER_GROUPS: LayerGroup[] = [
  { id: 'pola-ruang', label: 'Pola ruang', description: 'Peruntukan dan pemanfaatan kawasan', categories: ['pola-ruang'] },
  { id: 'ketentuan-khusus', label: 'Ketentuan khusus', description: 'Kawasan dengan ketentuan tambahan', categories: ['ketentuan-khusus'] },
  { id: 'pertanian', label: 'Lahan pertanian', description: 'LSD dan LP2B', categories: ['lsd', 'lp2b'] },
  { id: TRANSPORT_CATEGORY, label: 'Struktur ruang', description: 'Sistem jaringan transportasi', categories: [TRANSPORT_CATEGORY] },
  { id: ADMIN_CATEGORY, label: 'Batas administrasi', description: 'Desa, kelurahan, dan kecamatan', categories: [ADMIN_CATEGORY], defaultOpen: true },
];

export function groupLayers(layers: Layer[]): GroupedLayers[] {
  return LAYER_GROUPS
    .map((group) => ({ ...group, layers: layers.filter((layer) => group.categories.includes(layer.category)) }))
    .filter((group) => group.layers.length > 0);
}

/** Selected layers in catalogue order. IDs missing from the catalogue are ignored. */
export function pickLayers(layers: Layer[], ids: string[]) {
  const selected = new Set(ids);
  return layers.filter((layer) => selected.has(layer.id));
}

export function toggleLayerIds(current: string[], ids: string[], enabled: boolean) {
  return enabled ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id));
}

// Boundaries and roads are drawn as lines; every other layer is a translucent area.
export const isAreaLayer = (layer: Pick<Layer, 'category'>) => layer.category !== ADMIN_CATEGORY && layer.category !== TRANSPORT_CATEGORY;
