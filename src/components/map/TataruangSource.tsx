import { TATARUANG_SOURCE } from "../../lib/structure-layers";

/** Attribution for the structure layers taken from the Portal Tata Ruang, which states no licence. */
export function TataruangSource() {
  return (
    <small className="source-note">
      Sumber: <a href={TATARUANG_SOURCE.url} target="_blank" rel="noreferrer">{TATARUANG_SOURCE.label}</a>,{" "}
      {TATARUANG_SOURCE.publisher}. Penerbit belum mencantumkan lisensi atau ketentuan penggunaan.
    </small>
  );
}
