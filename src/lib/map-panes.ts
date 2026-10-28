import type { CSSProperties } from 'react';
import type { Layer } from '../types.ts';
import { ADMIN_CATEGORY } from './layers.ts';
import { DISTRICT_LAYER } from './map-symbols.ts';

export const PANES = {
  hazard: 'hazard-overlay',
  boundaryHalo: 'boundary-halo',
  administrative: 'administrative-boundaries',
  district: 'district-boundaries',
  regionMask: 'region-mask',
  searchFocus: 'search-focus',
} as const;
export type PaneName = (typeof PANES)[keyof typeof PANES];

// Above Leaflet's overlay pane (400): hazard imagery, boundaries, the mask, then search results.
export const PANE_STYLES: Record<PaneName, CSSProperties> = {
  [PANES.hazard]: { zIndex: 405, pointerEvents: 'none' },
  [PANES.boundaryHalo]: { zIndex: 410, pointerEvents: 'none' },
  // Boundary canvases cover the viewport even after their features are removed.
  // Let clicks reach the data below; spatial identification still finds boundaries.
  [PANES.administrative]: { zIndex: 420, pointerEvents: 'none' },
  [PANES.district]: { zIndex: 430, pointerEvents: 'none' },
  [PANES.regionMask]: { zIndex: 450, pointerEvents: 'none' },
  [PANES.searchFocus]: { zIndex: 460, pointerEvents: 'none' },
};

export function layerPane(layer: Pick<Layer, 'category' | 'name'>) {
  if (layer.category !== ADMIN_CATEGORY) return 'overlayPane';
  return layer.name === DISTRICT_LAYER ? PANES.district : PANES.administrative;
}
