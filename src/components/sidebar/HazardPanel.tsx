import { useId } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { TriangleAlert } from "lucide-react";
import { HAZARDS } from "../../lib/hazards";
import type { HazardId } from "../../lib/hazards";

const NONE = "none";
const options = [{ id: NONE, label: "Tidak ditampilkan" }, ...HAZARDS];

/** One hazard at a time: overlapping index rasters would not be readable. */
export function HazardPanel({ hazard, onHazard }: { hazard: HazardId | null; onHazard: (hazard: HazardId | null) => void }) {
  const headingId = useId();
  return (
    <section className="hazard-section" aria-labelledby={headingId}>
      <div className="section-title">
        <h2 id={headingId}>
          <TriangleAlert size={16} />
          Bahaya bencana
        </h2>
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        className="hazard-options"
        value={hazard ?? NONE}
        onChange={(value) => onHazard(value === NONE ? null : (value as HazardId))}
      >
        {options.map((option) => (
          <Radio key={option.id} value={option.id} className="hazard-option">
            <span className="radio-dot" />
            {option.label}
          </Radio>
        ))}
      </RadioGroup>
      <p className="hazard-note">
        Indeks bahaya InaRISK BNPB, terpisah dari rencana tata ruang.
      </p>
    </section>
  );
}
