import { HAZARD_RAMP } from "../../lib/hazards";
import type { Hazard } from "../../lib/hazards";

const ramp = `linear-gradient(to right, ${HAZARD_RAMP.join(", ")})`;

export function HazardLegend({ hazard }: { hazard: Hazard }) {
  return (
    <section className="legend-layer" aria-label={`Bahaya ${hazard.label}`}>
      <h3>Bahaya {hazard.label.toLowerCase()} · InaRISK BNPB</h3>
      <div className="hazard-ramp" style={{ background: ramp }} />
      <div className="hazard-scale">
        <span>Rendah</span>
        <span>Tinggi</span>
      </div>
      <p className="legend-note">
        Indeks bahaya 0–1 dengan resolusi 100 m; area tanpa warna tidak
        memiliki indeks. Bahaya berbeda dari risiko. Tahun data tidak
        dicantumkan pada layanan BNPB.
      </p>
    </section>
  );
}
