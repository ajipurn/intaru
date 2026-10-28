import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppFooter } from "./components/app/AppFooter";
import { Brand } from "./components/app/Brand";
import { MapView, Sidebar } from "./components/app/lazy";
import { ToolsSheet } from "./components/app/ToolsSheet";
import { Deferred } from "./components/ui/Deferred";
import { ErrorNotice, StatusNotice } from "./components/ui/Notice";
import { useMapPreferences } from "./hooks/use-map-preferences";
import { useMediaQuery } from "./hooks/use-media-query";
import { useRegionSearch } from "./hooks/use-region-search";
import { indexQuery } from "./lib/data";
import { pickLayers } from "./lib/layers";
import { DISTRICT_LAYER, VILLAGE_LAYER } from "./lib/map-symbols";
import type { Layer, LayerStatusMap, MapFocus, MapFocusTarget } from "./types";

// Matches the 900px breakpoint in styles.css.
const WIDE_LAYOUT = "(min-width: 901px)";
const emptyLayers: Layer[] = [];

export default function App() {
  const index = useQuery(indexQuery);
  const layers = index.data?.layers ?? emptyLayers;
  const [preferences, actions] = useMapPreferences();
  const selectedLayers = useMemo(() => pickLayers(layers, preferences.layers), [layers, preferences.layers]);
  const regionLayers = useMemo(() => layers.filter((layer) => layer.name === DISTRICT_LAYER || layer.name === VILLAGE_LAYER), [layers]);
  const wide = useMediaQuery(WIDE_LAYOUT);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [layerStatus, setLayerStatus] = useState<LayerStatusMap>({});

  useEffect(() => {
    if (wide) setToolsOpen(false);
  }, [wide]);

  const showFocus = useCallback((target: MapFocusTarget) => {
    setFocus({ ...target, key: Date.now() });
    setToolsOpen(false);
  }, []);
  const resetView = useCallback(() => showFocus({ reset: true }), [showFocus]);
  const openTools = useCallback(() => setToolsOpen(true), []);
  const regionSearch = useRegionSearch(layers, showFocus);

  const sidebar = (
    <Deferred label="Menyiapkan pencarian…">
      <Sidebar
        layers={layers}
        loading={index.isPending}
        status={layerStatus}
        preferences={preferences}
        actions={actions}
        regionSearch={regionSearch}
      />
    </Deferred>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-map">
        Lewati ke konten utama
      </a>
      <div className="workspace">
        {wide && (
          <aside className="desktop-sidebar" aria-label="Pencarian dan layer peta">
            <Brand />
            {sidebar}
          </aside>
        )}
        <main className="map-main" id="main-map" tabIndex={-1}>
          <h1 className="sr-only">Peta Tata Ruang Kabupaten Kebumen</h1>
          <Deferred label="Menyiapkan peta Kebumen…">
            <MapView
              layers={selectedLayers}
              regionLayers={regionLayers}
              preferences={preferences}
              actions={actions}
              focus={focus}
              onReset={resetView}
              onOpenTools={openTools}
              onStatus={setLayerStatus}
            />
          </Deferred>
          {index.isPending && (
            <StatusNotice className="catalog-status">Menyiapkan pilihan layer…</StatusNotice>
          )}
          {index.isError && (
            <ErrorNotice message="Data layer belum dapat dimuat." onRetry={() => void index.refetch()} />
          )}
        </main>
      </div>
      <AppFooter data={index.data} />
      <ToolsSheet isOpen={toolsOpen} onOpenChange={setToolsOpen}>
        {sidebar}
      </ToolsSheet>
    </div>
  );
}
