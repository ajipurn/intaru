import type { Position } from 'geojson';
import type { GeoData } from '../types';

// [south, west], [north, east], from the exported Kebumen district boundaries.
export const KEBUMEN_BOUNDS: [[number, number], [number, number]] = [
  [-7.831230022825919, 109.37875935919647],
  [-7.445676053360805, 109.83925076039372],
];
export const REGION_FIT_OPTIONS = { padding: [32, 48] as [number, number], animate: false };

/** Kebumen's outline rings: the holes of the prepared exterior mask, whose outer ring is the world. */
export function regionRings(mask: GeoData): Position[][] {
  return mask.features.flatMap(({ geometry }) => {
    if (geometry?.type === 'Polygon') return geometry.coordinates.slice(1);
    if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flatMap((polygon) => polygon.slice(1));
    return [];
  });
}
