import type { MapPreferenceActions } from "../../hooks/use-map-preferences";
import type { RegionSearch } from "../../hooks/use-region-search";
import type { MapPreferences } from "../../lib/map-preferences";
import type { Layer, LayerStatusMap } from "../../types";
import { HazardPanel } from "./HazardPanel";
import { LayerPanel } from "./LayerPanel";
import { LocationSearch } from "./LocationSearch";
import { MapSettings } from "./MapSettings";

export function Sidebar({ layers, loading, status, preferences, actions, regionSearch }: {
  layers: Layer[];
  loading: boolean;
  status: LayerStatusMap;
  preferences: MapPreferences;
  actions: MapPreferenceActions;
  regionSearch: RegionSearch;
}) {
  return (
    <div className="sidebar-content">
      <LocationSearch {...regionSearch} />
      <LayerPanel
        layers={layers}
        selected={preferences.layers}
        status={status}
        loading={loading}
        base={preferences.basemap}
        opacity={preferences.opacity}
        onToggle={actions.toggleLayers}
        onClear={actions.clearLayers}
      />
      <HazardPanel hazard={preferences.hazard} onHazard={actions.setHazard} />
      <MapSettings
        opacity={preferences.opacity}
        inspect={preferences.inspect}
        onOpacity={actions.setOpacity}
        onInspect={actions.setInspect}
      />
    </div>
  );
}
