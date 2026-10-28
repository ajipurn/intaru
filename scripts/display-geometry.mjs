import { simplify } from '@turf/simplify';
import { DISPLAY_PROPERTY_FIELDS } from '../src/lib/map-symbols.ts';

// Display only: ~0.55 m in Kebumen. Original files and PostGIS stay untouched.
export const DISPLAY_TOLERANCE = 0.000005;
export const DISPLAY_VERSION = 'v3';
const presentationFields = new Set(DISPLAY_PROPERTY_FIELDS);
function roundCoordinates(coordinates) {
  return typeof coordinates[0] === 'number' ? coordinates.map((value) => Number(value.toFixed(7))) : coordinates.map(roundCoordinates);
}
function roundGeometry(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === 'GeometryCollection') return { ...geometry, geometries: geometry.geometries.map(roundGeometry) };
  const coordinates = roundCoordinates(geometry.coordinates);
  const rings = geometry.type === 'Polygon' ? coordinates : geometry.type === 'MultiPolygon' ? coordinates.flat() : [];
  // Keep sub-centimetre rings at original precision if rounding collapses them.
  if (rings.some((ring) => new Set(ring.map((point) => point.join(','))).size < 3)) return geometry;
  return { ...geometry, coordinates };
}
export function displayGeometry(data) {
  const display = simplify(data, { tolerance: DISPLAY_TOLERANCE, highQuality: true });
  return { ...display, features: display.features.map((feature) => ({
    ...feature,
    properties: Object.fromEntries(Object.entries(feature.properties ?? {}).filter(([key]) => presentationFields.has(key))),
    geometry: roundGeometry(feature.geometry),
  })) };
}
