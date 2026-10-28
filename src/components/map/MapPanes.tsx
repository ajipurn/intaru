import { Pane } from "react-leaflet";
import { PANES, PANE_STYLES } from "../../lib/map-panes";

// RegionMask creates its own pane so it can draw with an SVG renderer.
const LAYER_PANES = [PANES.hazard, PANES.boundaryHalo, PANES.administrative, PANES.district, PANES.structure, PANES.searchFocus];

export function MapPanes() {
  return LAYER_PANES.map((name) => <Pane key={name} name={name} style={PANE_STYLES[name]} />);
}
