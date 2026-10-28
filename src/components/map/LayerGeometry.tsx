import { memo, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useLatestRef } from "../../hooks/use-latest-ref";
import { ADMIN_CATEGORY, TRANSPORT_CATEGORY } from "../../lib/layers";
import { layerPane, PANES } from "../../lib/map-panes";
import { boundaryHaloStyle, layerStyle } from "../../lib/map-style";
import type { Basemap } from "../../lib/map-symbols";
import type { GeoData, Layer, SelectedPoint } from "../../types";

function applyStyle(group: L.GeoJSON | null, style: L.PathOptions | L.StyleFunction) {
  if (!group) return;
  group.options.style = style;
  group.setStyle(style);
}

// Geometry stays mounted when panels, search, or identification state change.
// Add large layers in short batches so controls remain available during rendering.
export const LayerGeometry = memo(function LayerGeometry({
  layer,
  data,
  opacity,
  base,
  inspectRef,
  onSelect,
  onRendering,
}: {
  layer: Layer;
  data: GeoData;
  opacity: number;
  base: Basemap;
  inspectRef: RefObject<boolean>;
  onSelect: (point: SelectedPoint) => void;
  onRendering: (id: string, value: boolean) => void;
}) {
  const map = useMap();
  const group = useRef<L.GeoJSON | null>(null);
  const haloGroup = useRef<L.GeoJSON | null>(null);
  const appearance = useLatestRef({ opacity, base });
  useEffect(() => {
    const halo =
      layer.category === ADMIN_CATEGORY
        ? L.geoJSON(undefined, {
            pane: PANES.boundaryHalo,
            interactive: false,
            style: boundaryHaloStyle(appearance.current.base, layer.name),
          }).addTo(map)
        : null;
    haloGroup.current = halo;
    const geometry = L.geoJSON(undefined, {
      pane: layerPane(layer),
      style: layerStyle(layer, appearance.current.opacity, appearance.current.base),
      bubblingMouseEvents: false,
      onEachFeature: (feature, item) =>
        item.on("click", (event: L.LeafletMouseEvent) => {
          if (!inspectRef.current) return;
          onSelect({
            ...event.latlng,
            // Roads are thin lines, so report the clicked road itself.
            clicked:
              layer.category === TRANSPORT_CATEGORY
                ? { layer_id: layer.id, layer_name: layer.name, properties: feature.properties }
                : undefined,
          });
        }),
    }).addTo(map);
    group.current = geometry;
    let cursor = 0,
      frame = 0,
      stopped = false;
    onRendering(layer.id, true);
    const addBatch = () => {
      if (stopped) return;
      const started = performance.now();
      do {
        const feature = data.features[cursor++];
        halo?.addData(feature);
        geometry.addData(feature);
      } while (cursor < data.features.length && performance.now() - started < 8);
      if (cursor < data.features.length) frame = requestAnimationFrame(addBatch);
      else onRendering(layer.id, false);
    };
    if (data.features.length) frame = requestAnimationFrame(addBatch);
    else onRendering(layer.id, false);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      geometry.remove();
      halo?.remove();
      group.current = null;
      haloGroup.current = null;
    };
  }, [data, layer, map, inspectRef, onSelect, onRendering, appearance]);
  useEffect(() => {
    applyStyle(group.current, layerStyle(layer, opacity, base));
    applyStyle(haloGroup.current, boundaryHaloStyle(base, layer.name));
  }, [opacity, base, layer]);
  return null;
});
