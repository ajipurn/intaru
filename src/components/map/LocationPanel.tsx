import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "react-aria-components";
import { ArrowUpRight, MapPin } from "lucide-react";
import { identifyQuery } from "../../lib/data";
import { getLocationResults } from "../../lib/location-results";
import type { Basemap } from "../../lib/map-symbols";
import type { Layer, SelectedPoint } from "../../types";
import { PanelHeading } from "../ui/PanelHeading";
import { Spinner } from "../ui/Spinner";
import { DistrictSummary, NearbyFacilities } from "./LocationEnrichment";
import { MapSwatch } from "./MapSwatch";

/** Identifies the clicked point against the active layers. */
export function LocationPanel({ point, layers, regionLayer, base, opacity, onClose }: {
  point: SelectedPoint;
  layers: Layer[];
  /** District boundaries, used for the population summary even when the layer is off. */
  regionLayer?: Layer;
  base: Basemap;
  opacity: number;
  onClose: () => void;
}) {
  const identification = useQuery(identifyQuery(point, layers, true));
  const matches = identification.data ?? [];
  const results = useMemo(
    () => {
      const clicked = point.clicked;
      const active = clicked && layers.some((layer) => layer.id === clicked.layer_id);
      return getLocationResults(active ? [clicked, ...matches] : matches, base);
    },
    [point.clicked, layers, matches, base],
  );
  return (
    <section className="location-panel" aria-label="Informasi lokasi">
      <PanelHeading title="Informasi lokasi" closeLabel="Tutup informasi lokasi" onClose={onClose} />
      <h3 className="location-coordinates">
        <MapPin size={17} />
        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </h3>
      <p className="inspection-note">
        Informasi kawasan dari layer yang aktif.
      </p>
      <div className="location-matches" aria-live="polite">
        {identification.isFetching && (
          <p className="identifying" role="status">
            <Spinner />
            Memeriksa lokasi…
          </p>
        )}
        {identification.isError && (
          <div role="alert">
            <p>{identification.error.message}</p>
            <Button className="text-button" onPress={() => void identification.refetch()}>
              Coba lagi
            </Button>
          </div>
        )}
        {results.map((result) => (
          <div className="location-match" key={result.key}>
            <MapSwatch symbols={[result.symbol]} opacity={opacity} />
            <div>
              <strong>{result.title}</strong>
              {result.detail && <span>{result.detail}</span>}
              {result.district && <small>{result.district}</small>}
            </div>
          </div>
        ))}
        {!identification.isFetching && !identification.isError && !results.length && (
          <p>
            {layers.length
              ? "Tidak ada kawasan teridentifikasi pada titik ini."
              : "Aktifkan layer untuk memeriksa informasi kawasan."}
          </p>
        )}
      </div>
      <DistrictSummary point={point} regionLayer={regionLayer} />
      <NearbyFacilities point={point} />
      <a
        className="coordinate-link"
        href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        Buka di Google Maps
        <ArrowUpRight size={16} />
      </a>
    </section>
  );
}
