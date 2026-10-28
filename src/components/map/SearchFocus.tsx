import { GeoJSON } from "react-leaflet";
import { PANES } from "../../lib/map-panes";
import { searchFocusStyles } from "../../lib/map-style";
import type { Basemap } from "../../lib/map-symbols";
import type { MapFocus } from "../../types";

/** Outline of the searched district or village. */
export function SearchFocus({ focus, base }: { focus: MapFocus | null; base: Basemap }) {
  if (!focus?.data) return null;
  const styles = searchFocusStyles(base);
  return (
    <>
      {styles.halo && (
        <GeoJSON key={`focus-halo-${focus.key}`} data={focus.data} pane={PANES.searchFocus} interactive={false} style={styles.halo} />
      )}
      <GeoJSON key={`focus-${focus.key}`} data={focus.data} pane={PANES.searchFocus} interactive={false} style={styles.outline} />
    </>
  );
}
