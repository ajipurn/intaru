import type { Feature } from 'geojson';
import type { CircleMarkerOptions, PathOptions } from 'leaflet';
import type { Layer } from '../types.ts';
import { DISTRICT_LAYER, featureSymbol, VILLAGE_LAYER } from './map-symbols.ts';
import type { Basemap, MapSymbol } from './map-symbols.ts';

export const POINT_RADIUS = 5;
// Used by both the Leaflet paths and the SVG legend samples.
export function symbolStyle(symbol: MapSymbol, opacity: number): CircleMarkerOptions {
  // Points keep full colour at any area opacity; the white ring separates them from the basemap.
  if (symbol.kind === 'point') return { color: '#fff', weight: 1.5, opacity: 1, fill: true, fillColor: symbol.color, fillOpacity: 0.95, radius: symbol.radius ?? POINT_RADIUS };
  const village = symbol.id === VILLAGE_LAYER;
  const administrative = village || symbol.id === DISTRICT_LAYER;
  return {
    color: symbol.color,
    fillColor: symbol.color,
    fill: symbol.kind === 'area',
    fillOpacity: symbol.kind === 'area' ? opacity / 100 : 0,
    opacity: administrative ? symbol.haloColor ? 1 : 0.75 : 0.95,
    weight: administrative ? symbol.haloColor ? village ? 1.35 : 2.2 : 1.7 : symbol.kind === 'line' ? 2.5 : 0.65,
    dashArray: symbol.dashArray,
  };
}

export function layerStyle(layer: Layer, opacity: number, base: Basemap) {
  return (feature?: Feature) => symbolStyle(featureSymbol(layer.name, feature?.properties ?? null, base), opacity);
}

export function boundaryHaloStyle(base: Basemap, name: string): PathOptions {
  const symbol = featureSymbol(name, null, base);
  return { color: symbol.haloColor, weight: name === VILLAGE_LAYER ? 3.5 : 4.5, stroke: Boolean(symbol.haloColor), opacity: 0.9, fill: false, interactive: false };
}

// Satellite imagery needs a bright outline with a dark halo to keep search results visible.
const DEFAULT_FOCUS = { outline: { color: '#0b4d46', weight: 3, fillOpacity: 0.08 } };
const SATELLITE_FOCUS = {
  halo: { color: '#10251b', weight: 6, opacity: 0.9, fill: false },
  outline: { color: '#fde047', weight: 3, opacity: 1, fillOpacity: 0.08 },
};
export function searchFocusStyles(base: Basemap): { halo?: PathOptions; outline: PathOptions } {
  return base === 'satellite' ? SATELLITE_FOCUS : DEFAULT_FOCUS;
}

export const SELECTED_POINT_STYLE: PathOptions = { color: '#fff', fillColor: '#0b4d46', fillOpacity: 1, weight: 3 };
export const FACILITY_MARKER_STYLE: PathOptions = { color: '#0b4d46', fillColor: '#fff', fillOpacity: 1, weight: 2 };
