import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GeoJSON, Pane } from "react-leaflet";
import { regionMaskQuery } from "../../lib/data";
import { PANES, PANE_STYLES } from "../../lib/map-panes";
import L from "leaflet";

const maskStyle = {
  stroke: false,
  fillColor: "#152820",
  fillOpacity: 0.42,
  fillRule: "evenodd" as const,
};

export const RegionMask = memo(function RegionMask() {
  const { data } = useQuery(regionMaskQuery);
  // A viewport-sized Canvas exposes blank edges during drag until moveend.
  // Draw this single mask in SVG, keeping its world polygon and holes intact.
  const style = useMemo(() => ({
    ...maskStyle,
    noClip: true,
    renderer: L.svg({ pane: PANES.regionMask }),
  }), []);
  return (
    <Pane name={PANES.regionMask} style={PANE_STYLES[PANES.regionMask]}>
      {data && <GeoJSON data={data} interactive={false} style={style} />}
    </Pane>
  );
});
