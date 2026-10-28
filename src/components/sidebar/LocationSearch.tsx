import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Label, SearchField } from "react-aria-components";
import { ArrowUpRight, MapPin, Search, X } from "lucide-react";
import { villagesQuery } from "../../lib/data";
import { parseCoordinates, searchVillages } from "../../lib/geo";
import type { Point, SearchResult } from "../../types";
import { Spinner } from "../ui/Spinner";

export function LocationSearch({ search, searching, error }: {
  search: (target: SearchResult | Point) => void;
  searching: boolean;
  error: string;
}) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const headingId = useId();
  const villages = useQuery(villagesQuery);
  const results = useMemo(
    () => searchVillages(villages.data ?? [], value),
    [villages.data, value],
  );
  const coordinates = parseCoordinates(value);
  return (
    <section className="search-section" aria-labelledby={headingId}>
      <h2 id={headingId}>
        <MapPin size={16} />
        Lokasi
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (coordinates) search(coordinates);
          else if (results.length === 1) search(results[0]);
        }}
      >
        <SearchField
          value={value}
          onChange={(text) => {
            setValue(text);
            setSubmitted(false);
          }}
          className="search-field"
        >
          <Label className="sr-only">
            Cari desa, kecamatan, atau koordinat
          </Label>
          <Search size={18} aria-hidden="true" />
          <Input placeholder="Desa, kecamatan, atau koordinat" />
          <Button className="clear-search" aria-label="Hapus pencarian">
            <X size={15} />
          </Button>
        </SearchField>
        {coordinates && (
          <Button type="submit" className="coordinate-result">
            <MapPin size={16} />
            Buka {coordinates.lat}, {coordinates.lng}
            <ArrowUpRight size={15} />
          </Button>
        )}
      </form>
      {value.trim().length >= 2 && !coordinates && (
        <div className="search-results" aria-label="Hasil pencarian">
          {results.map((result) => (
            <Button
              className="search-result"
              key={`${result.kind}-${result.name}-${result.district}`}
              onPress={() => search(result)}
            >
              <MapPin size={17} />
              <span>
                <strong>{result.name}</strong>
                <small>
                  {result.kind === "district"
                    ? "Kecamatan"
                    : `Desa / Kelurahan · ${result.district}`}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </Button>
          ))}
          {!results.length && (
            <p role="status">
              {villages.isPending
                ? "Memuat data wilayah…"
                : villages.isError
                  ? "Data pencarian gagal dimuat."
                  : "Wilayah tidak ditemukan. Coba nama lain atau koordinat desimal."}
            </p>
          )}
        </div>
      )}
      {submitted &&
        !coordinates &&
        !results.length &&
        value.trim().length < 2 && (
          <p className="field-error">
            Masukkan minimal dua huruf atau koordinat latitude, longitude.
          </p>
        )}
      {(searching || error) && (
        <div className="search-state" role={error ? "alert" : "status"}>
          {searching ? (
            <>
              <Spinner size={14} />
              Menemukan batas wilayah…
            </>
          ) : (
            error
          )}
        </div>
      )}
    </section>
  );
}
