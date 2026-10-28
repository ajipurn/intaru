import { useQuery } from "@tanstack/react-query";
import { CircleMarker } from "react-leaflet";
import { nearbyFacilitiesQuery } from "../../lib/data";
import { PANES } from "../../lib/map-panes";
import { FACILITY_MARKER_STYLE } from "../../lib/map-style";
import type { Point } from "../../types";

/** Facilities listed in the location panel; shares its cached query. */
export function FacilityMarkers({ point }: { point: Point }) {
  const { data } = useQuery(nearbyFacilitiesQuery(point));
  return data?.map((facility) => (
    <CircleMarker
      key={facility.id}
      center={facility}
      pane={PANES.searchFocus}
      radius={5}
      interactive={false}
      pathOptions={FACILITY_MARKER_STYLE}
    />
  ));
}
