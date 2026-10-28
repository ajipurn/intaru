import type { Layer } from '../types.ts';

export const ADMIN_CATEGORY = 'administrasi';
export const STRUCTURE_CATEGORY = 'strukturRuang';

export type LayerGroup = { id: string; label: string; description: string; categories: string[]; defaultOpen?: boolean };
export type GroupedLayers = LayerGroup & { layers: Layer[] };

export const LAYER_GROUPS: LayerGroup[] = [
  { id: 'pola-ruang', label: 'Pola ruang', description: 'Peruntukan dan pemanfaatan kawasan', categories: ['pola-ruang'] },
  { id: 'ketentuan-khusus', label: 'Ketentuan khusus', description: 'Kawasan dengan ketentuan tambahan', categories: ['ketentuan-khusus'] },
  { id: 'pertanian', label: 'Lahan pertanian', description: 'LSD dan LP2B', categories: ['lsd', 'lp2b'] },
  { id: STRUCTURE_CATEGORY, label: 'Struktur ruang', description: 'Pusat permukiman, transportasi, energi, telekomunikasi, sumber daya air, dan prasarana lainnya', categories: [STRUCTURE_CATEGORY] },
  { id: ADMIN_CATEGORY, label: 'Batas administrasi', description: 'Desa, kelurahan, dan kecamatan', categories: [ADMIN_CATEGORY], defaultOpen: true },
];

export function groupLayers(layers: Layer[]): GroupedLayers[] {
  return LAYER_GROUPS
    .map((group) => ({ ...group, layers: layers.filter((layer) => group.categories.includes(layer.category)) }))
    .filter((group) => group.layers.length > 0);
}

const groupOrder = (layer: Layer) => {
  const index = LAYER_GROUPS.findIndex((group) => group.categories.includes(layer.category));
  return index < 0 ? LAYER_GROUPS.length : index;
};

/** Selected layers in sidebar order: by group, then catalogue order. IDs missing from the catalogue are ignored. */
export function pickLayers(layers: Layer[], ids: string[]) {
  const selected = new Set(ids);
  // Later sources append to the catalogue, so the legend follows the groups instead.
  return layers.filter((layer) => selected.has(layer.id)).sort((a, b) => groupOrder(a) - groupOrder(b));
}

export function toggleLayerIds(current: string[], ids: string[], enabled: boolean) {
  return enabled ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id));
}

// Boundaries and structure networks are drawn as lines or points; every other layer is a translucent area.
export const isAreaLayer = (layer: Pick<Layer, 'category'>) => layer.category !== ADMIN_CATEGORY && layer.category !== STRUCTURE_CATEGORY;
