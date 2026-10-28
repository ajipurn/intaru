import type { Geometry, Position } from 'geojson';
import type { Point, SearchResult, Village } from '../types.ts';

export function normalize(value: string) { return value.trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' '); }

export function parseCoordinates(value: string): Point | null {
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]), lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function onSegment(x: number, y: number, a: Position, b: Position) {
  const cross = (y - a[1]) * (b[0] - a[0]) - (x - a[0]) * (b[1] - a[1]);
  return Math.abs(cross) < 1e-12 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1]);
}

function inRing(point: Point, ring: Position[]): boolean {
  let inside = false;
  const { lng: x, lat: y } = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (onSegment(x, y, a, b)) return true;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function inPolygon(point: Point, rings: Position[][]) {
  return rings.length > 0 && inRing(point, rings[0]) && !rings.slice(1).some((ring) => inRing(point, ring));
}

export function containsPoint(geometry: Geometry | null, point: Point): boolean {
  if (!geometry) return false;
  switch (geometry.type) {
    case 'Polygon': return inPolygon(point, geometry.coordinates);
    case 'MultiPolygon': return geometry.coordinates.some((polygon) => inPolygon(point, polygon));
    case 'GeometryCollection': return geometry.geometries.some((item) => containsPoint(item, point));
    default: return false;
  }
}

export function searchVillages(villages: Village[], value: string): SearchResult[] {
  const keyword = normalize(value);
  if (keyword.length < 2) return [];
  const districts = [...new Set(villages.map((village) => village.KECAMATAN))];
  return [
    ...districts.filter((district) => normalize(district).includes(keyword)).map((district): SearchResult => ({ kind: 'district', name: district, district })),
    ...villages.filter((village) => normalize(village.DESAKEL).includes(keyword)).map((village): SearchResult => ({ kind: 'village', name: village.DESAKEL, district: village.KECAMATAN })),
  ].sort((a, b) => Number(normalize(b.name) === keyword) - Number(normalize(a.name) === keyword)).slice(0, 10);
}

