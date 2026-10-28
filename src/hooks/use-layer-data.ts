import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { layerQuery } from '../lib/data';
import type { Layer, LayerStatus, LayerStatusMap } from '../types';

/** Loads the given layers and reports progress, including the batched Leaflet render. */
export function useLayerData(layers: Layer[], onStatus: (status: LayerStatusMap) => void) {
  const queries = useQueries({ queries: layers.map(layerQuery) });
  const [rendering, setRendering] = useState<Record<string, boolean>>({});
  const onRendering = useCallback(
    (id: string, value: boolean) => setRendering((current) => current[id] === value ? current : { ...current, [id]: value }),
    [],
  );
  const statuses = layers.map((layer, index): LayerStatus => {
    const query = queries[index];
    return query.isError ? 'error' : query.isPending || rendering[layer.id] !== false ? 'loading' : 'ready';
  });
  // Report a new object only when some layer actually changes state.
  const statusKey = layers.map((layer, index) => `${layer.id}:${statuses[index]}`).join('|');
  const status = useMemo(
    () => Object.fromEntries(statusKey ? statusKey.split('|').map((entry) => entry.split(':')) : []) as LayerStatusMap,
    [statusKey],
  );
  useEffect(() => onStatus(status), [status, onStatus]);
  return {
    queries,
    loadingCount: statuses.filter((value) => value === 'loading').length,
    failed: queries.filter((query) => query.isError),
    onRendering,
  };
}
