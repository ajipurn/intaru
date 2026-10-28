import { hazardById } from './hazards.ts';
import type { HazardId } from './hazards.ts';
import { BASEMAP_IDS } from './map-symbols.ts';
import type { Basemap } from './map-symbols.ts';

export const MAP_PREFERENCES_KEY = 'intaru.map.v1';
export type MapViewport = { lat: number; lng: number; zoom: number };
export type MapPreferences = {
  version: 1;
  layers: string[];
  basemap: Basemap;
  opacity: number;
  inspect: boolean;
  legendOpen: boolean;
  hazard: HazardId | null;
  viewport: MapViewport | null;
};

export function defaultMapPreferences(): MapPreferences {
  return { version: 1, layers: ['batas-kecamatan'], basemap: 'streets', opacity: 65, inspect: true, legendOpen: false, hazard: null, viewport: null };
}

function validViewport(value: unknown): value is MapViewport {
  if (!value || typeof value !== 'object') return false;
  const view = value as MapViewport;
  return [view.lat, view.lng, view.zoom].every((number) => typeof number === 'number' && Number.isFinite(number))
    && Math.abs(view.lat) <= 85.051129 && Math.abs(view.lng) <= 180 && view.zoom >= 5 && view.zoom <= 19;
}

export function parseMapPreferences(serialized: string | null): MapPreferences {
  const defaults = defaultMapPreferences();
  if (!serialized) return defaults;
  try {
    const value = JSON.parse(serialized);
    if (!value || typeof value !== 'object' || value.version !== 1) return defaults;
    return {
      version: 1,
      layers: Array.isArray(value.layers) && value.layers.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 200)
        ? [...new Set<string>(value.layers)] : defaults.layers,
      basemap: BASEMAP_IDS.includes(value.basemap) ? value.basemap : defaults.basemap,
      opacity: typeof value.opacity === 'number' && Number.isFinite(value.opacity) && value.opacity >= 10 && value.opacity <= 100 ? value.opacity : defaults.opacity,
      inspect: typeof value.inspect === 'boolean' ? value.inspect : defaults.inspect,
      legendOpen: typeof value.legendOpen === 'boolean' ? value.legendOpen : defaults.legendOpen,
      hazard: hazardById(value.hazard)?.id ?? null,
      viewport: validViewport(value.viewport) ? { lat: value.viewport.lat, lng: value.viewport.lng, zoom: value.viewport.zoom } : null,
    };
  } catch { return defaults; }
}

export function readMapPreferences(storage?: Pick<Storage, 'getItem'>): MapPreferences {
  try { return parseMapPreferences((storage ?? window.localStorage).getItem(MAP_PREFERENCES_KEY)); }
  catch { return defaultMapPreferences(); }
}

export function writeMapPreferences(value: MapPreferences, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? window.localStorage).setItem(MAP_PREFERENCES_KEY, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function sameViewport(a: MapViewport | null, b: MapViewport | null) {
  return a === b || Boolean(a && b && a.lat === b.lat && a.lng === b.lng && a.zoom === b.zoom);
}
