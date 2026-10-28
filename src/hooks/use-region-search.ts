import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { layerQuery } from '../lib/data';
import { findRegionFeatures, regionLayerName } from '../lib/region-search';
import type { Layer, MapFocusTarget, Point, SearchResult } from '../types';

/** Resolves a coordinate or a district/village search result to a map focus. */
export function useRegionSearch(layers: Layer[], onFound: (target: MapFocusTarget) => void) {
  const client = useQueryClient();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (target: SearchResult | Point) => {
    setError('');
    if ('lat' in target) return onFound({ point: target });
    const boundary = layers.find((layer) => layer.name === regionLayerName(target.kind));
    if (!boundary) return setError('Data wilayah masih disiapkan. Coba lagi sebentar.');
    setSearching(true);
    try {
      const features = findRegionFeatures(await client.fetchQuery(layerQuery(boundary)), target);
      if (!features.length) throw new Error(`Batas ${target.name} belum ditemukan.`);
      onFound({ data: { type: 'FeatureCollection', features }, label: target.name, district: target.kind === 'district' ? target.district : undefined });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Pencarian gagal. Silakan coba lagi.');
    } finally {
      setSearching(false);
    }
  }, [client, layers, onFound]);
  const search = useCallback((target: SearchResult | Point) => void run(target), [run]);
  return { search, searching, error };
}

export type RegionSearch = ReturnType<typeof useRegionSearch>;
