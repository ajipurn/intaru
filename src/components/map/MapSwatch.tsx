import { POINT_RADIUS, symbolStyle } from '../../lib/map-style';
import type { MapSymbol } from '../../lib/map-symbols';

// Map radii up to 10 px fit the 16 px sample while keeping their hierarchy.
const sampleRadius = (symbol: MapSymbol) => Math.min(6.5, Math.max(2.5, (symbol.radius ?? POINT_RADIUS) * 0.65));
// Multi-category point layers show up to six of their colours as a cluster of dots.
const DOTS = [[6, 5], [12, 5], [18, 5], [6, 11], [12, 11], [18, 11]];

export function MapSwatch({ symbols, opacity }: { symbols: MapSymbol[]; opacity: number }) {
  if (!symbols.length) return null;
  const symbol = symbols[0];
  const style = symbolStyle(symbol, opacity);
  const multiple = symbols.length > 1;
  return <svg className="map-swatch" viewBox="0 0 24 16" aria-hidden="true" data-symbol-id={multiple ? 'multiple' : symbol.id} data-colors={symbols.map((item) => item.color).join(',')}>
    {multiple && symbols.every((item) => item.kind === 'point') ? symbols.slice(0, DOTS.length).map((item, index) => {
      const [x, y] = symbols.length > 3 ? DOTS[index] : [24 / (symbols.length + 1) * (index + 1), 8];
      return <circle key={item.id} cx={x} cy={y} r={2.6} fill={item.color} stroke="#fff" strokeWidth={1} />;
    })
      : multiple ? symbols.map((item, index) => <rect key={item.id} x={index * 24 / symbols.length} y={1} width={24 / symbols.length + 0.1} height={14} fill={item.color} fillOpacity={symbolStyle(item, opacity).fill ? opacity / 100 : 0.95} />)
      : symbol.kind === 'point' ? <circle cx={12} cy={8} r={sampleRadius(symbol)} fill={symbol.color} fillOpacity={style.fillOpacity} stroke={style.color} strokeWidth={1.5} />
      : symbol.kind === 'line' ? <>
        {symbol.haloColor && <path d="M1 8H23" stroke={symbol.haloColor} strokeWidth={5} />}
        <path d="M1 8H23" stroke={symbol.color} strokeWidth={2} strokeOpacity={style.opacity} strokeDasharray={symbol.dashArray} />
      </> : <rect x={1} y={1} width={22} height={14} rx={2} fill={symbol.color} fillOpacity={style.fillOpacity} stroke={symbol.color} strokeWidth={1} strokeOpacity={style.opacity} />}
  </svg>;
}
