import { useId, useMemo } from "react";
import { Button, Checkbox } from "react-aria-components";
import { AlertCircle, ChevronDown, Layers2 } from "lucide-react";
import { groupLayers } from "../../lib/layers";
import type { GroupedLayers } from "../../lib/layers";
import { displayLayerName, layerSymbols } from "../../lib/map-symbols";
import type { Basemap } from "../../lib/map-symbols";
import type { Layer, LayerStatus, LayerStatusMap } from "../../types";
import { CheckboxBox } from "../ui/CheckboxBox";
import { Spinner } from "../ui/Spinner";
import { MapSwatch } from "../map/MapSwatch";

type Appearance = { base: Basemap; opacity: number };
type Toggle = (ids: string[], enabled: boolean) => void;

export function LayerPanel({ layers, selected, status, loading, base, opacity, onToggle, onClear }: Appearance & {
  layers: Layer[];
  selected: string[];
  status: LayerStatusMap;
  loading: boolean;
  onToggle: Toggle;
  onClear: () => void;
}) {
  const headingId = useId();
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const groups = useMemo(() => groupLayers(layers), [layers]);
  const activeCount = layers.filter((layer) => selectedIds.has(layer.id)).length;
  return (
    <section className="layer-section" aria-labelledby={headingId}>
      <div className="section-title">
        <h2 id={headingId}>
          <Layers2 size={16} />
          Layer
        </h2>
        <span role="status">{activeCount} aktif</span>
        <Button className="clear-filters" onPress={onClear} isDisabled={activeCount === 0}>
          Hapus filter
        </Button>
      </div>
      {loading && (
        <div className="layer-skeleton" role="status" aria-label="Memuat pilihan layer">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="layer-groups">
        {groups.map((group) => (
          <LayerGroupSection
            key={group.id}
            group={group}
            selectedIds={selectedIds}
            status={status}
            base={base}
            opacity={opacity}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

function LayerGroupSection({ group, selectedIds, status, base, opacity, onToggle }: Appearance & {
  group: GroupedLayers;
  selectedIds: Set<string>;
  status: LayerStatusMap;
  onToggle: Toggle;
}) {
  const ids = group.layers.map((layer) => layer.id);
  const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectedCount === ids.length;
  const partiallySelected = selectedCount > 0 && !allSelected;
  return (
    <div className="layer-group">
      <Checkbox
        className="group-checkbox"
        aria-label={`Pilih semua layer ${group.label}`}
        isSelected={allSelected}
        isIndeterminate={partiallySelected}
        onChange={(checked) => onToggle(ids, checked)}
      >
        <CheckboxBox indeterminate={partiallySelected} />
      </Checkbox>
      <details open={group.defaultOpen}>
        <summary>
          <span>{group.label}</span>
          <small>
            {selectedCount > 0 ? `${selectedCount} / ` : ""}
            {ids.length}
          </small>
          <ChevronDown size={15} />
        </summary>
        <p className="group-description">{group.description}</p>
        <div className="layer-items">
          {group.layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              selected={selectedIds.has(layer.id)}
              status={status[layer.id]}
              base={base}
              opacity={opacity}
              onToggle={onToggle}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

function LayerItem({ layer, selected, status, base, opacity, onToggle }: Appearance & {
  layer: Layer;
  selected: boolean;
  status?: LayerStatus;
  onToggle: Toggle;
}) {
  const name = displayLayerName(layer.name);
  const symbols = layerSymbols(layer, base);
  return (
    <Checkbox
      className="layer-checkbox"
      aria-label={name}
      isSelected={selected}
      onChange={(checked) => onToggle([layer.id], checked)}
    >
      <CheckboxBox />
      <MapSwatch symbols={symbols} opacity={opacity} />
      <span className="layer-name">
        {name}
        {symbols.length > 1 && <small>Beragam kategori · lihat legenda</small>}
      </span>
      <span className="layer-status">
        {selected && status === "loading" && <Spinner size={14} aria-label="Memuat" />}
        {selected && status === "error" && <AlertCircle size={14} aria-label="Gagal dimuat" />}
      </span>
    </Checkbox>
  );
}
