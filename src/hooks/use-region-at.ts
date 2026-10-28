import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { identifyQuery } from '../lib/data';
import { regionAt } from '../lib/location-results';
import type { Layer, Point } from '../types';

/** District and village of a point from the boundary layers, whether or not they are shown. */
export function useRegionAt(point: Point, regionLayers: Layer[]) {
  const query = useQuery(identifyQuery(point, regionLayers, regionLayers.length > 0));
  const region = useMemo(() => regionAt(query.data ?? []), [query.data]);
  return { ...region, pending: query.isFetching && !query.data, failed: query.isError };
}
export type RegionState = ReturnType<typeof useRegionAt>;
