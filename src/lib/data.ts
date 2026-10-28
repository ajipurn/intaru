import { createClient } from '@supabase/supabase-js';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { queryOptions } from '@tanstack/react-query';
import type { NearbyFacility } from './facilities';
import type { DataIndex, DistrictPopulation, GeoData, Layer, LocationMatch, Point, Village } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
if (Boolean(url) !== Boolean(key)) throw new Error('Isi kedua variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.');
export const supabase = url && key ? createClient(url, key) : null;
export const dataMode = supabase ? 'supabase' : 'snapshot';
export const SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxTNBb_lzPMLlIqEMPue0QPFcXyjRTcLhJZTt0rmB_yqCn87Ihtn_Qv197eeZ_sgbKx/exec';
// The worker client is only needed once geometry is requested.
const geometryClient = () => import('./geometry-client');

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Data gagal dimuat (HTTP ${response.status}).`);
  return response.json();
}

export const indexQuery = queryOptions({
  queryKey: ['data-index', dataMode],
  queryFn: async ({ signal }): Promise<DataIndex> => {
    if (!supabase) return getJSON<DataIndex>('/data/index.json', signal);
    const { data, error } = await supabase.from('map_layers').select('*').order('sort_order').abortSignal(signal);
    if (error) throw new Error(error.message);
    if (!data.length) throw new Error('Data Supabase masih kosong. Jalankan importer terlebih dahulu.');
    const layers = data.map((layer) => ({
      ...layer,
      revision: layer.imported_at,
      display_asset_path: layer.display_asset_path ?? undefined,
      symbol_ids: layer.symbol_ids ?? undefined,
    }));
    return { sourceUrl: '', exportedAt: data[0].imported_at, layers };
  },
});

export const villagesQuery = queryOptions({
  queryKey: ['villages', dataMode],
  queryFn: async ({ signal }): Promise<Village[]> => {
    if (!supabase) return getJSON<Village[]>('/data/villages.json', signal);
    const { data, error } = await supabase.from('villages').select('name,district').order('name').limit(1000).abortSignal(signal);
    if (error) throw new Error(error.message);
    return data.map((item) => ({ DESAKEL: item.name, KECAMATAN: item.district }));
  },
});

// Enrichment tables exist only once their migration is applied; until then use the bundled snapshot.
const MISSING_SCHEMA = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);
// Remember missing tables for the session instead of asking again on every map click.
const missing = new Set<string>();
async function enrichment<T>(
  resource: string,
  remote: (client: SupabaseClient) => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
  snapshot: () => Promise<T>,
): Promise<T> {
  if (!supabase || missing.has(resource)) return snapshot();
  const { data, error } = await remote(supabase);
  if (error && MISSING_SCHEMA.has(error.code)) {
    missing.add(resource);
    return snapshot();
  }
  if (error) throw new Error(error.message);
  return data as T;
}

export const populationQuery = queryOptions({
  queryKey: ['district-population', dataMode],
  queryFn: ({ signal }) => enrichment<DistrictPopulation[]>(
    'district_population',
    (client) => client.from('district_population').select('*').abortSignal(signal),
    () => getJSON('/data/enrichment/population.json', signal),
  ),
  staleTime: Infinity,
});

export const FACILITY_RADIUS = 1500;
const FACILITY_LIMIT = 8;
const FACILITIES_PATH = '/data/enrichment/facilities.geojson.gz';

export function nearbyFacilitiesQuery(point: Point | null) {
  return queryOptions({
    queryKey: ['nearby-facilities', dataMode, point?.lat, point?.lng],
    enabled: Boolean(point),
    queryFn: async ({ signal }): Promise<NearbyFacility[]> => {
      if (!point) return [];
      return enrichment(
        'nearby_facilities',
        (client) => client.rpc('nearby_facilities', { p_lat: point.lat, p_lng: point.lng, p_radius: FACILITY_RADIUS, p_limit: FACILITY_LIMIT }).abortSignal(signal),
        async () => (await geometryClient()).nearbyFacilities(FACILITIES_PATH, point, FACILITY_RADIUS, FACILITY_LIMIT, signal),
      );
    },
    staleTime: 5 * 60_000,
  });
}

export function layerQuery(layer: Layer) {
  return queryOptions({
    queryKey: ['geojson', dataMode, layer.id, layer.revision, layer.display_asset_path ?? layer.asset_path],
    queryFn: async ({ signal }): Promise<GeoData> => {
      const { readGeometry } = await geometryClient();
      try { return await readGeometry(layer.display_asset_path ?? layer.asset_path, signal); }
      catch (error) {
        if (signal.aborted || !layer.display_asset_path) throw error;
        return readGeometry(layer.asset_path, signal);
      }
    },
    staleTime: Infinity,
    gcTime: 15 * 60_000,
    structuralSharing: false,
  });
}

const MASK_FILE = 'kebumen-mask.geojson.gz';
const maskPath = supabase ? supabase.storage.from('map-data').getPublicUrl(MASK_FILE).data.publicUrl : `/data/${MASK_FILE}`;

export const regionMaskQuery = queryOptions({
  queryKey: ['kebumen-region-mask', dataMode],
  queryFn: async ({ signal }): Promise<GeoData> => {
    const { readGeometry } = await geometryClient();
    return readGeometry(maskPath, signal);
  },
  staleTime: Infinity,
  gcTime: Infinity,
  structuralSharing: false,
});

export function identifyQuery(point: Point | null, layers: Layer[], enabled: boolean) {
  const ids = layers.map((layer) => layer.id).sort();
  return queryOptions({
    queryKey: ['identify', dataMode, point?.lat, point?.lng, ids, layers.map((layer) => `${layer.id}:${layer.revision ?? layer.asset_path}`).sort()],
    enabled: enabled && Boolean(point) && ids.length > 0,
    queryFn: async ({ signal }): Promise<LocationMatch[]> => {
      if (!point) return [];
      if (!supabase) {
        const { identifyGeometry } = await geometryClient();
        return identifyGeometry(point, layers, signal);
      }
      const { data, error } = await supabase.rpc('identify_location', { p_lat: point.lat, p_lng: point.lng, p_layers: ids }).abortSignal(signal);
      if (error) throw new Error('Informasi lokasi belum dapat dimuat. Coba lagi.');
      return (data as LocationMatch[]).filter((item, index, all) => all.slice(0, index).filter((previous) => previous.layer_id === item.layer_id).length < 4);
    },
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
  });
}
