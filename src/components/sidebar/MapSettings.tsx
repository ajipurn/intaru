import { useEffect, useState } from "react";
import { Label, Slider, SliderOutput, SliderThumb, SliderTrack, Switch } from "react-aria-components";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export function MapSettings({ opacity, inspect, onOpacity, onInspect }: {
  opacity: number;
  inspect: boolean;
  onOpacity: (value: number) => void;
  onInspect: (value: boolean) => void;
}) {
  // Preview while dragging; save once the slider is released.
  const [draftOpacity, setDraftOpacity] = useState(opacity);
  useEffect(() => setDraftOpacity(opacity), [opacity]);
  return (
    <details className="map-settings">
      <summary>
        <SlidersHorizontal size={16} />
        Pengaturan
        <ChevronDown size={15} />
      </summary>
      <div className="settings-content">
        <Slider
          minValue={10}
          maxValue={100}
          value={draftOpacity}
          onChange={(number) => setDraftOpacity(number as number)}
          onChangeEnd={(number) => onOpacity(number as number)}
          className="opacity-slider"
        >
          <div>
            <Label>Opasitas layer</Label>
            <SliderOutput>{draftOpacity}%</SliderOutput>
          </div>
          <SliderTrack>
            {({ state }) => (
              <>
                <div
                  className="slider-fill"
                  style={{ width: state.getThumbPercent(0) * 100 + "%" }}
                />
                <SliderThumb />
              </>
            )}
          </SliderTrack>
        </Slider>
        <Switch className="inspect-switch" isSelected={inspect} onChange={onInspect}>
          <span className="switch-track">
            <span />
          </span>
          <span>
            <strong>Identifikasi lokasi</strong>
            <small>Tampilkan informasi saat peta diklik.</small>
          </span>
        </Switch>
      </div>
    </details>
  );
}
