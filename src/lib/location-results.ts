import type { GeoJsonProperties } from 'geojson';
import type { LocationMatch } from '../types.ts';
import { displayLayerName, DISTRICT_LAYER, featureName, featureSymbol, VILLAGE_LAYER } from './map-symbols.ts';
import type { Basemap, MapSymbol } from './map-symbols.ts';

export type LocationResult = {
  key: string;
  title: string;
  detail?: string;
  district?: string;
  symbol: MapSymbol;
};

const text = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const canonical = (value = '') => text(value).normalize('NFKC').replace(/_/g, ' ').toLocaleLowerCase('id-ID');

function property(properties: GeoJsonProperties, keys: string[]) {
  for (const key of keys) {
    const value = text(properties?.[key]);
    if (value && !/^(tidak ada|ada|null|undefined|-)$/i.test(value)) return value;
  }
  return '';
}

function districtLabel(value: string) {
  let name = text(value);
  while (name) {
    const next = name.replace(/^(?:kecamatan\b|kec(?:\.|\b))[\s._-]*/i, '').trim();
    if (next === name) break;
    name = next;
  }
  return name ? `Kecamatan ${name}` : undefined;
}

export function getLocationResults(matches: LocationMatch[], base: Basemap = 'streets'): LocationResult[] {
  const seen = new Set<string>();
  const results: LocationResult[] = [];
  for (const { layer_id, layer_name, properties } of matches) {
    const title = displayLayerName(layer_name);
    let district = districtLabel(property(properties, ['WADMKC', 'KECAMATAN', 'WADMKC_1']));
    const name = layer_name === DISTRICT_LAYER ? district ?? text(featureName(properties, title))
      : layer_name === VILLAGE_LAYER ? property(properties, ['WADMKD', 'DESAKEL']) || text(featureName(properties, title))
      : text(featureName(properties, title));
    const detail = canonical(name) === canonical(title) ? undefined : name || undefined;
    if (canonical(district) === canonical(detail ?? title)) district = undefined;
    const symbol = featureSymbol(layer_name, properties, base);
    // Neighbouring fragments and a clicked road can produce the same visible
    // result. Keep distinct layers, classifications and districts separate.
    const key = JSON.stringify([layer_id, canonical(title), canonical(detail), canonical(district), symbol.id]);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ key, title, detail, district, symbol });
  }
  return results;
}
