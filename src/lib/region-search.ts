import type { GeoData, SearchResult } from '../types.ts';
import { normalize } from './geo.ts';
import { DISTRICT_LAYER, VILLAGE_LAYER } from './map-symbols.ts';

export const regionLayerName = (kind: SearchResult['kind']) => kind === 'district' ? DISTRICT_LAYER : VILLAGE_LAYER;

const field = (value: unknown) => normalize(String(value || ''));

/** Boundary features for a district or village search result. */
export function findRegionFeatures(data: GeoData, target: SearchResult): GeoData['features'] {
  const district = normalize(target.district);
  const name = normalize(target.name);
  return data.features.filter(({ properties }) => {
    const item = properties ?? {};
    if (field(item.WADMKC || item.KECAMATAN) !== district) return false;
    return target.kind === 'district' || field(item.WADMKD || item.DESAKEL || item.NAMOBJ) === name;
  });
}
