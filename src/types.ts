import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type GeoData = FeatureCollection<Geometry, GeoJsonProperties>;
export type Point = { lat: number; lng: number };
export type Layer = {
  id: string;
  name: string;
  category: string;
  asset_path: string;
  display_asset_path?: string;
  source_bytes?: number;
  display_bytes?: number;
  revision?: string;
  symbol_ids?: string[];
  feature_count: number;
  bounds: [number, number, number, number] | null;
};
export type Village = { DESAKEL: string; KECAMATAN: string };
export type DataIndex = { sourceUrl: string; exportedAt: string; layers: Layer[] };
export type SearchResult = { kind: 'district' | 'village'; name: string; district: string };
export type LocationMatch = { layer_id: string; layer_name: string; properties: GeoJsonProperties };
export type DistrictPopulation = {
  code: string; district: string; year: number; population: number; publisher: string; source_url: string; retrieved_at: string;
  area_km2?: number | null; area_year?: number | null; area_publisher?: string | null; area_source_url?: string | null;
};
export type LayerStatus = 'loading' | 'ready' | 'error';
export type LayerStatusMap = Record<string, LayerStatus>;
export type SelectedPoint = Point & { clicked?: LocationMatch };
// Moves the map to a coordinate, a search result, or back to the whole regency.
export type MapFocusTarget = { point?: Point; data?: GeoData; label?: string; district?: string; reset?: boolean };
export type MapFocus = MapFocusTarget & { key: number };
