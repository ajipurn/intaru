import { useCallback, useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { MapViewport } from "../../lib/map-preferences";
import { KEBUMEN_BOUNDS, REGION_FIT_OPTIONS } from "../../lib/region-view";
import type { MapFocus, SelectedPoint } from "../../types";

/** Keeps the viewport saved, applies focus requests, and refits Kebumen on resize. */
export function MapEvents({ focus, inspect, onSelect, initialViewport, onViewport }: {
  focus: MapFocus | null;
  inspect: boolean;
  onSelect: (point: SelectedPoint | null) => void;
  initialViewport: MapViewport | null;
  onViewport: (viewport: MapViewport) => void;
}) {
  const map = useMap();
  const autoFit = useRef(initialViewport === null);
  const fitting = useRef(false);
  const ready = useRef(false);
  const saveViewport = useCallback(() => {
    if (!ready.current) return;
    const center = map.getCenter().wrap();
    const viewport = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    map.getContainer().dataset.mapView = JSON.stringify({ ...viewport, fitsKebumen: map.getBounds().contains(KEBUMEN_BOUNDS) });
    onViewport(viewport);
  }, [map, onViewport]);
  const fitRegion = useCallback(() => {
    fitting.current = true;
    autoFit.current = true;
    map.fitBounds(KEBUMEN_BOUNDS, REGION_FIT_OPTIONS);
    fitting.current = false;
    saveViewport();
  }, [map, saveViewport]);
  useMapEvents({
    click: (event) => { if (inspect) onSelect(event.latlng); },
    moveend: saveViewport,
    zoomend: saveViewport,
    dragstart: () => { autoFit.current = false; },
    zoomstart: () => { if (!fitting.current) autoFit.current = false; },
  });
  useEffect(() => {
    ready.current = true;
    if (!initialViewport) fitRegion();
    else saveViewport();
    const saveWhenHidden = () => { if (document.visibilityState === 'hidden') saveViewport(); };
    window.addEventListener('pagehide', saveViewport);
    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => {
      ready.current = false;
      window.removeEventListener('pagehide', saveViewport);
      document.removeEventListener('visibilitychange', saveWhenHidden);
    };
  }, [initialViewport, fitRegion, saveViewport]);
  useEffect(() => {
    if (!focus) return;
    if (focus.reset) {
      fitRegion(); onSelect(null);
    } else if (focus.data) {
      autoFit.current = false;
      const bounds = L.geoJSON(focus.data).getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15, animate: false });
      onSelect(null);
    } else if (focus.point) {
      autoFit.current = false;
      map.setView(focus.point, 16, { animate: false }); onSelect(focus.point);
    }
  }, [focus, map, onSelect, fitRegion]);
  useEffect(() => {
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
        if (autoFit.current) fitRegion(); else saveViewport();
      });
    });
    observer.observe(map.getContainer());
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [map, fitRegion, saveViewport]);
  return null;
}
