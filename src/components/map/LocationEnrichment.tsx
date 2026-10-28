import { useQuery } from "@tanstack/react-query";
import { Button } from "react-aria-components";
import { useDistrictPopulation } from "../../hooks/use-district-population";
import { FACILITY_RADIUS, identifyQuery, nearbyFacilitiesQuery } from "../../lib/data";
import { FACILITY_CATEGORIES, formatDistance } from "../../lib/facilities";
import type { Layer, Point } from "../../types";
import { Spinner } from "../ui/Spinner";

/** District of the selected point with its population, independent of the active layers. */
export function DistrictSummary({ point, regionLayer }: { point: Point; regionLayer?: Layer }) {
  const region = useQuery(identifyQuery(point, regionLayer ? [regionLayer] : [], Boolean(regionLayer)));
  const properties = region.data?.[0]?.properties;
  const district = properties ? String(properties.KECAMATAN ?? properties.WADMKC ?? "") || undefined : undefined;
  const population = useDistrictPopulation(district);
  if (!regionLayer) return null;
  return (
    <section className="location-section" aria-label="Wilayah">
      <h3>Wilayah</h3>
      {region.isFetching && !region.data ? (
        <p className="identifying" role="status">
          <Spinner size={14} />
          Mencari kecamatan…
        </p>
      ) : district ? (
        <>
          <p className="district-name">Kecamatan {district}</p>
          {population && (
            <p>
              {population.population.toLocaleString("id-ID")} jiwa pada {population.year}
              <small className="source-note">Sumber: {population.publisher}</small>
            </p>
          )}
        </>
      ) : (
        <p>{region.isError ? "Kecamatan belum dapat diperiksa." : "Titik berada di luar batas kecamatan Kebumen."}</p>
      )}
    </section>
  );
}

export function NearbyFacilities({ point }: { point: Point }) {
  const nearby = useQuery(nearbyFacilitiesQuery(point));
  return (
    <section className="location-section" aria-label="Fasilitas umum terdekat">
      <h3>Fasilitas umum dalam {formatDistance(FACILITY_RADIUS)}</h3>
      {nearby.isPending && (
        <p className="identifying" role="status">
          <Spinner size={14} />
          Mencari fasilitas…
        </p>
      )}
      {nearby.isError && (
        <div role="alert">
          <p>Fasilitas belum dapat dimuat.</p>
          <Button className="text-button" onPress={() => void nearby.refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {nearby.data?.length === 0 && <p>Belum ada fasilitas yang tercatat di sekitar titik ini.</p>}
      {Boolean(nearby.data?.length) && (
        <ul className="facility-list">
          {nearby.data?.map((facility) => (
            <li key={facility.id}>
              <span>
                <strong>{facility.name || facility.kind}</strong>
                <small>{facility.name ? facility.kind : FACILITY_CATEGORIES[facility.category]}</small>
              </span>
              <span className="facility-distance">{formatDistance(facility.distance)}</span>
            </li>
          ))}
        </ul>
      )}
      <small className="source-note">
        © kontributor OpenStreetMap (ODbL). Kelengkapan data berbeda antarkecamatan.
      </small>
    </section>
  );
}
