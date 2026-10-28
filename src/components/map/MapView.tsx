import { useCallback, useRef, useState } from "react";
import { CircleMarker, MapContainer, ScaleControl, TileLayer, ZoomControl } from "react-leaflet";
import { MapPin } from "lucide-react";
import { useDistrictPopulation } from "../../hooks/use-district-population";
import { useLatestRef } from "../../hooks/use-latest-ref";
import { useLayerData } from "../../hooks/use-layer-data";
import type { MapPreferenceActions } from "../../hooks/use-map-preferences";
import { BASEMAPS } from "../../lib/basemaps";
import { hazardById } from "../../lib/hazards";
import { PANES } from "../../lib/map-panes";
import type { MapPreferences } from "../../lib/map-preferences";
import { SELECTED_POINT_STYLE } from "../../lib/map-style";
import { KEBUMEN_BOUNDS, REGION_FIT_OPTIONS } from "../../lib/region-view";
import type { Layer, LayerStatus, LayerStatusMap, MapFocus, SelectedPoint } from "../../types";
import { ErrorNotice, StatusNotice } from "../ui/Notice";
import { FacilityMarkers } from "./FacilityMarkers";
import { HazardOverlay } from "./HazardOverlay";
import { LayerGeometry } from "./LayerGeometry";
import { LegendPanel } from "./LegendPanel";
import { LocationPanel } from "./LocationPanel";
import { MapBottomBar, MapToolbar } from "./MapControls";
import { MapEvents } from "./MapEvents";
import { MapPanes } from "./MapPanes";
import { RegionMask } from "./RegionMask";
import { SearchFocus } from "./SearchFocus";

function MapContext({ focus }: { focus: MapFocus }) {
  const population = useDistrictPopulation(focus.district);
  return (
    <div className="map-context">
      <MapPin size={15} />
      <span>
        {focus.label}
        {population && (
          <small>
            {population.population.toLocaleString("id-ID")} jiwa ({population.year}) · {population.publisher}
          </small>
        )}
      </span>
    </div>
  );
}

export function MapView({ layers, regionLayers, preferences, actions, focus, onReset, onOpenTools, onStatus }: {
  /** The selected layers, in catalogue order. */
  layers: Layer[];
  regionLayers: Layer[];
  preferences: MapPreferences;
  actions: MapPreferenceActions;
  focus: MapFocus | null;
  onReset: () => void;
  onOpenTools: () => void;
  onStatus: (status: LayerStatusMap) => void;
}) {
  const { basemap: base, opacity, inspect, legendOpen } = preferences;
  const [point, setPoint] = useState<SelectedPoint | null>(null);
  const initialViewport = useRef(preferences.viewport).current;
  const inspectRef = useLatestRef(inspect);
  const { queries, loadingCount, failed, onRendering } = useLayerData(layers, onStatus);
  const hazard = hazardById(preferences.hazard);
  const [hazardStatus, setHazardStatus] = useState<LayerStatus>("ready");
  const [hazardAttempt, setHazardAttempt] = useState(0);
  const retryHazard = useCallback(() => setHazardAttempt((attempt) => attempt + 1), []);
  const basemap = BASEMAPS[base];
  const loading = loadingCount + (hazard && hazardStatus === "loading" ? 1 : 0);
  return (
    <div className="map-view" id="peta">
      <MapContainer
        center={initialViewport ? [initialViewport.lat, initialViewport.lng] : undefined}
        zoom={initialViewport?.zoom}
        bounds={initialViewport ? undefined : KEBUMEN_BOUNDS}
        boundsOptions={REGION_FIT_OPTIONS}
        zoomSnap={0.1}
        zoomDelta={0.5}
        minZoom={5}
        maxZoom={19}
        zoomControl={false}
        preferCanvas
        className="map-canvas"
        aria-label="Peta interaktif Kabupaten Kebumen"
      >
        <TileLayer key={base} url={basemap.url} attribution={basemap.attribution} maxZoom={19} />
        <RegionMask />
        <MapPanes />
        {hazard && <HazardOverlay key={`${hazard.id}-${hazardAttempt}`} hazard={hazard} onStatus={setHazardStatus} />}
        <ZoomControl position="topright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <MapEvents
          focus={focus}
          inspect={inspect}
          onSelect={setPoint}
          initialViewport={initialViewport}
          onViewport={actions.setViewport}
        />
        {layers.map((layer, index) => {
          const data = queries[index].data;
          return data && (
            <LayerGeometry
              key={`${layer.id}-${layer.display_asset_path ?? layer.asset_path}`}
              layer={layer}
              data={data}
              opacity={opacity}
              base={base}
              inspectRef={inspectRef}
              onSelect={setPoint}
              onRendering={onRendering}
            />
          );
        })}
        <SearchFocus focus={focus} base={base} />
        {point && inspect && <FacilityMarkers point={point} />}
        {point && inspect && (
          <CircleMarker center={point} pane={PANES.searchFocus} radius={7} pathOptions={SELECTED_POINT_STYLE} />
        )}
      </MapContainer>
      {focus?.label && <MapContext focus={focus} />}
      <MapToolbar base={base} onBasemap={actions.setBasemap} onReset={onReset} />
      <MapBottomBar
        layerCount={layers.length + (hazard ? 1 : 0)}
        legendOpen={legendOpen}
        onLegendOpen={actions.setLegendOpen}
        onOpenTools={onOpenTools}
      />
      {/* Notice and panel order matters: the stylesheet positions them with sibling selectors. */}
      {loading > 0 && (
        <StatusNotice className="map-loading">Menyiapkan {loading} layer…</StatusNotice>
      )}
      {failed.length > 0 && (
        <ErrorNotice
          message="Layer belum dapat dimuat. Periksa koneksi lalu coba lagi."
          onRetry={() => failed.forEach((query) => void query.refetch())}
        />
      )}
      {hazard && hazardStatus === "error" && (
        <ErrorNotice message={`Layer bahaya ${hazard.label.toLowerCase()} dari InaRISK belum dapat dimuat.`} onRetry={retryHazard} />
      )}
      {legendOpen && (
        <LegendPanel
          layers={layers}
          hazard={hazard}
          queries={queries}
          base={base}
          opacity={opacity}
          onClose={() => actions.setLegendOpen(false)}
        />
      )}
      {point && inspect && (
        <LocationPanel point={point} layers={layers} regionLayers={regionLayers} base={base} opacity={opacity} onClose={() => setPoint(null)} />
      )}
    </div>
  );
}
