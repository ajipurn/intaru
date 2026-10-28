import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { regionMaskQuery } from "../../lib/data";
import { hazardTileUrl, INARISK_ATTRIBUTION } from "../../lib/hazards";
import type { Hazard } from "../../lib/hazards";
import { PANES } from "../../lib/map-panes";
import { KEBUMEN_BOUNDS, regionRings } from "../../lib/region-view";
import type { LayerStatus } from "../../types";

// The image service renders every tile on request, so only ask for tiles over Kebumen.
const bounds = L.latLngBounds(KEBUMEN_BOUNDS);

/**
 * Hazard tiles drawn on canvases clipped to Kebumen, so the index stops at the
 * regency border. Rings are in zoom-0 pixels; tiles scale them to their own zoom.
 */
class ClippedHazardTiles extends L.GridLayer {
  private hazard: Hazard;
  private rings: L.Point[][] | null;
  private images = new WeakMap<HTMLElement, HTMLImageElement>();

  constructor(hazard: Hazard, rings: L.Point[][] | null, options: L.GridLayerOptions) {
    super(options);
    this.hazard = hazard;
    this.rings = rings;
    // Stop downloading tiles that left the view, as L.TileLayer does.
    this.on("tileunload", ({ tile }) => {
      const image = this.images.get(tile);
      if (!image) return;
      image.onload = image.onerror = null;
      image.src = "";
    });
  }

  createTile(coords: L.Coords, done: L.DoneCallback) {
    const size = this.getTileSize();
    const ratio = window.devicePixelRatio || 1;
    const tile = document.createElement("canvas");
    tile.width = size.x * ratio;
    tile.height = size.y * ratio;
    const image = new Image();
    this.images.set(tile, image);
    image.onload = () => {
      const context = tile.getContext("2d");
      if (!context) return done(new Error("Canvas tidak tersedia."), tile);
      context.scale(ratio, ratio);
      if (this.rings) {
        const scale = 2 ** coords.z;
        const origin = coords.scaleBy(size);
        context.beginPath();
        for (const ring of this.rings) {
          ring.forEach(({ x, y }, index) => {
            const method = index ? "lineTo" : "moveTo";
            context[method](x * scale - origin.x, y * scale - origin.y);
          });
          context.closePath();
        }
        context.clip();
      }
      context.drawImage(image, 0, 0, size.x, size.y);
      done(undefined, tile);
    };
    image.onerror = () => done(new Error("Tile bahaya gagal dimuat."), tile);
    image.src = hazardTileUrl(this.hazard, coords.x, coords.y, coords.z);
    return tile;
  }
}

/** InaRISK hazard index imagery inside Kebumen, drawn below the boundaries. */
export function HazardOverlay({ hazard, onStatus }: { hazard: Hazard; onStatus: (status: LayerStatus) => void }) {
  const map = useMap();
  const mask = useQuery(regionMaskQuery);
  const rings = useMemo(() => mask.data
    ? regionRings(mask.data).map((ring) => ring.map(([lng, lat]) => map.options.crs!.latLngToPoint(L.latLng(lat, lng), 0)))
    : null, [map, mask.data]);
  // Without the outline the index is still useful, so draw it unclipped.
  const ready = mask.isSuccess || mask.isError;
  useEffect(() => {
    if (!ready) {
      onStatus("loading");
      return;
    }
    const layer = new ClippedHazardTiles(hazard, rings, {
      pane: PANES.hazard,
      opacity: 0.7,
      bounds,
      attribution: INARISK_ATTRIBUTION,
      updateWhenZooming: false,
      maxNativeZoom: 16,
      maxZoom: 19,
    });
    let failed = false;
    layer.on("loading", () => {
      failed = false;
      onStatus("loading");
    });
    layer.on("tileerror", () => {
      failed = true;
    });
    layer.on("load", () => onStatus(failed ? "error" : "ready"));
    layer.addTo(map);
    return () => {
      layer.remove();
      onStatus("ready");
    };
  }, [hazard, map, onStatus, ready, rings]);
  return null;
}
