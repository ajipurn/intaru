import { useCallback, useMemo, useRef, useState } from 'react';
import { toggleLayerIds } from '../lib/layers';
import { readMapPreferences, sameViewport, writeMapPreferences } from '../lib/map-preferences';
import type { MapPreferences } from '../lib/map-preferences';

type PreferencePatch = Partial<Omit<MapPreferences, 'version'>>;

export function useMapPreferences() {
  const [preferences, setPreferences] = useState(readMapPreferences);
  const latest = useRef(preferences);
  const update = useCallback((patch: PreferencePatch) => {
    const previous = latest.current;
    const next = { ...previous, ...patch };
    if (sameViewport(previous.viewport, next.viewport)) next.viewport = previous.viewport;
    if (Object.keys(patch).every((key) => Object.is(previous[key as keyof MapPreferences], next[key as keyof MapPreferences]))) return;
    latest.current = next;
    // Write at the interaction boundary, without waiting for a React effect.
    writeMapPreferences(next);
    setPreferences(next);
  }, []);
  // Stable references: the map re-registers its listeners when these change.
  const actions = useMemo(() => {
    const set = <K extends keyof PreferencePatch>(key: K) => (value: MapPreferences[K]) => update({ [key]: value } as PreferencePatch);
    return {
      setBasemap: set('basemap'),
      setOpacity: set('opacity'),
      setInspect: set('inspect'),
      setLegendOpen: set('legendOpen'),
      setHazard: set('hazard'),
      setViewport: set('viewport'),
      toggleLayers: (ids: string[], enabled: boolean) => update({ layers: toggleLayerIds(latest.current.layers, ids, enabled) }),
      clearLayers: () => update({ layers: [] }),
    };
  }, [update]);
  return [preferences, actions] as const;
}

export type MapPreferenceActions = ReturnType<typeof useMapPreferences>[1];
