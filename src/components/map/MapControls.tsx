import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { ChevronDown, Crosshair, Layers2 } from "lucide-react";
import { BASEMAPS } from "../../lib/basemaps";
import type { Basemap } from "../../lib/map-symbols";

export function MapToolbar({ base, onBasemap, onReset }: {
  base: Basemap;
  onBasemap: (base: Basemap) => void;
  onReset: () => void;
}) {
  return (
    <div className="map-toolbar">
      <Select aria-label="Peta dasar" selectedKey={base} onSelectionChange={(key) => onBasemap(key as Basemap)}>
        <Button className="basemap-button">
          <Layers2 size={17} />
          <SelectValue />
          <ChevronDown size={14} />
        </Button>
        <Popover className="select-popover">
          <ListBox>
            {Object.entries(BASEMAPS).map(([id, basemap]) => (
              <ListBoxItem key={id} id={id} className="select-item">
                {basemap.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
      <Button className="map-icon-button" aria-label="Tampilkan seluruh Kebumen" onPress={onReset}>
        <Crosshair size={20} />
      </Button>
    </div>
  );
}

export function MapBottomBar({ layerCount, legendOpen, onLegendOpen, onOpenTools }: {
  layerCount: number;
  legendOpen: boolean;
  onLegendOpen: (open: boolean) => void;
  onOpenTools: () => void;
}) {
  return (
    <div className="map-bottom-bar">
      <Button className="mobile-tools-button" onPress={onOpenTools}>
        <Layers2 size={18} />
        Layer & lokasi<span>{layerCount}</span>
      </Button>
      <Button
        className={`legend-button ${legendOpen ? "is-active" : ""}`}
        onPress={() => onLegendOpen(!legendOpen)}
        aria-expanded={legendOpen}
      >
        <Layers2 size={17} />
        Legenda<span className="legend-count">{layerCount}</span>
        <ChevronDown size={14} />
      </Button>
    </div>
  );
}
