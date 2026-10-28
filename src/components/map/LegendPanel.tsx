import type { UseQueryResult } from "@tanstack/react-query";
import type { Hazard } from "../../lib/hazards";
import { isAreaLayer } from "../../lib/layers";
import type { Basemap } from "../../lib/map-symbols";
import { structureLayer } from "../../lib/structure-layers";
import type { GeoData, Layer } from "../../types";
import { PanelHeading } from "../ui/PanelHeading";
import { HazardLegend } from "./HazardLegend";
import { LayerLegend } from "./LayerLegend";
import { TataruangSource } from "./TataruangSource";

export function LegendPanel({ layers, hazard, queries, base, opacity, onClose }: {
  layers: Layer[];
  hazard: Hazard | null;
  queries: UseQueryResult<GeoData>[];
  base: Basemap;
  opacity: number;
  onClose: () => void;
}) {
  return (
    <section className="legend-panel" aria-label="Legenda layer aktif">
      <PanelHeading title="Legenda" closeLabel="Tutup legenda" onClose={onClose} />
      {!layers.length && !hazard && <p>Aktifkan layer untuk melihat legenda.</p>}
      {layers.map((layer, index) => (
        <LayerLegend
          key={layer.id}
          layer={layer}
          data={queries[index].data}
          failed={queries[index].isError}
          base={base}
          opacity={opacity}
        />
      ))}
      {layers.some((layer) => structureLayer(layer.name)) && (
        <p className="legend-note">
          Titik dan garis struktur ruang dapat diklik untuk melihat nama dan jenisnya.
          <TataruangSource />
        </p>
      )}
      {layers.some(isAreaLayer) && (
        <p className="legend-note">
          Opasitas kawasan {opacity}%. Warna tampilan menyatu dengan peta
          dasar di bawahnya.
        </p>
      )}
      {hazard && <HazardLegend hazard={hazard} />}
    </section>
  );
}
