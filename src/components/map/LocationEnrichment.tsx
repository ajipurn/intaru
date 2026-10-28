import { useQuery } from "@tanstack/react-query";
import { Button } from "react-aria-components";
import { useDistrictPopulation } from "../../hooks/use-district-population";
import type { RegionState } from "../../hooks/use-region-at";
import { FACILITY_RADIUS, nearbyFacilitiesQuery, weatherQuery } from "../../lib/data";
import { FACILITY_CATEGORIES, formatDistance } from "../../lib/facilities";
import { BMKG_SOURCE_URL, formatSlotTime, upcomingSlots } from "../../lib/weather";
import type { Point } from "../../types";
import { Spinner } from "../ui/Spinner";

/** District and village of the selected point with population and density, independent of the active layers. */
export function RegionSummary({ region }: { region: RegionState }) {
  const population = useDistrictPopulation(region.district);
  const area = population?.area_km2;
  return (
    <section className="location-section" aria-label="Wilayah">
      <h3>Wilayah</h3>
      {region.pending ? (
        <p className="identifying" role="status">
          <Spinner size={14} />
          Mencari wilayah…
        </p>
      ) : region.district ? (
        <>
          <p className="district-name">
            {region.village && `${region.village.kind} ${region.village.name}, `}Kecamatan {region.district}
          </p>
          {population && (
            <p>
              {population.population.toLocaleString("id-ID")} jiwa pada {population.year}
              {area && (
                <>
                  <br />
                  Luas {area.toLocaleString("id-ID")} km² · {Math.round(population.population / area).toLocaleString("id-ID")} jiwa/km²
                </>
              )}
              <small className="source-note">
                Sumber: penduduk {population.publisher}
                {area && `; luas ${population.area_publisher} ${population.area_year}`}
              </small>
            </p>
          )}
        </>
      ) : (
        <p>{region.failed ? "Wilayah belum dapat diperiksa." : "Titik berada di luar batas kecamatan Kebumen."}</p>
      )}
    </section>
  );
}

/** Next BMKG forecast slots for the selected village. */
export function WeatherForecast({ village }: { village: RegionState["village"] }) {
  const forecast = useQuery(weatherQuery(village?.code));
  if (!village?.code) return null;
  const slots = forecast.data ? upcomingSlots(forecast.data) : [];
  const timeZone = forecast.data?.lokasi?.timezone;
  return (
    <section className="location-section" aria-label="Prakiraan cuaca">
      <h3>Prakiraan cuaca</h3>
      {forecast.isPending && (
        <p className="identifying" role="status">
          <Spinner size={14} />
          Memuat prakiraan…
        </p>
      )}
      {forecast.isError && (
        <div role="alert">
          <p>Prakiraan cuaca belum dapat dimuat.</p>
          <Button className="text-button" onPress={() => void forecast.refetch()}>
            Coba lagi
          </Button>
        </div>
      )}
      {forecast.data && !slots.length && <p>Prakiraan untuk waktu ini belum tersedia.</p>}
      {slots.length > 0 && (
        <ul className="weather-list">
          {slots.map((slot) => (
            <li key={slot.datetime}>
              <span className="weather-time">{formatSlotTime(slot, timeZone)}</span>
              <img src={slot.image} alt="" width={22} height={22} loading="lazy" />
              <span className="weather-desc">{slot.weather_desc}</span>
              <span className="weather-temp">{slot.t}°C</span>
            </li>
          ))}
        </ul>
      )}
      <small className="source-note">
        Sumber: <a href={BMKG_SOURCE_URL} target="_blank" rel="noreferrer">BMKG</a>, prakiraan {village.kind.toLowerCase()} {village.name}
      </small>
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
