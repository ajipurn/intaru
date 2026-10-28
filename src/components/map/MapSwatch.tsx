import { symbolStyle } from '../../lib/map-style';
import type { MapSymbol } from '../../lib/map-symbols';

export function MapSwatch({ symbols, opacity }: { symbols: MapSymbol[]; opacity: number }) {
  if (!symbols.length) return null;
  const symbol = symbols[0];
  const style = symbolStyle(symbol, opacity);
  return <svg className="map-swatch" viewBox="0 0 24 16" aria-hidden="true" data-symbol-id={symbols.length === 1 ? symbol.id : 'multiple'} data-colors={symbols.map((item) => item.color).join(',')}>
    {symbols.length > 1 ? symbols.map((item, index) => <rect key={item.id} x={index * 24 / symbols.length} y={1} width={24 / symbols.length + 0.1} height={14} fill={item.color} fillOpacity={symbolStyle(item, opacity).fill ? opacity / 100 : 0.95} />)
      : symbol.kind === 'line' ? <>
        {symbol.haloColor && <path d="M1 8H23" stroke={symbol.haloColor} strokeWidth={5} />}
        <path d="M1 8H23" stroke={symbol.color} strokeWidth={2} strokeOpacity={style.opacity} strokeDasharray={symbol.dashArray} />
      </> : <rect x={1} y={1} width={22} height={14} rx={2} fill={symbol.color} fillOpacity={style.fillOpacity} stroke={symbol.color} strokeWidth={1} strokeOpacity={style.opacity} />}
  </svg>;
}
