import { memo, useMemo } from 'react';
import { collectFeatureSymbols, displayLayerName, RISK_LAYER } from '../../lib/map-symbols';
import type { Basemap } from '../../lib/map-symbols';
import type { GeoData, Layer } from '../../types';
import { MapSwatch } from './MapSwatch';

export const LayerLegend = memo(function LayerLegend({ layer, data, base, opacity, failed }: {
  layer: Layer; data: GeoData | undefined; base: Basemap; opacity: number; failed: boolean;
}) {
  const symbols = useMemo(() => data ? collectFeatureSymbols(layer.name, data.features, base) : [], [data, layer.name, base]);
  return <section className="legend-layer" aria-label={displayLayerName(layer.name)}>
    {(symbols.length !== 1 || symbols[0].label !== displayLayerName(layer.name) || layer.name === RISK_LAYER) && <h3>{displayLayerName(layer.name)}</h3>}
    {!data && <p>{failed ? 'Warna belum tersedia karena layer gagal dimuat.' : 'Memuat kategori warna…'}</p>}
    {data && !symbols.length && <p>Layer ini tidak memiliki fitur.</p>}
    {symbols.map((symbol) => <div className="legend-item" key={symbol.id}><MapSwatch symbols={[symbol]} opacity={opacity} /><span>{symbol.label}</span></div>)}
    {layer.name === RISK_LAYER && data && <p className="legend-note">Jika satu fitur memuat beberapa bencana, warna mengikuti bencana pertama yang tercantum pada data sumber. Klik lokasi untuk membaca seluruh keterangannya.</p>}
  </section>;
});
