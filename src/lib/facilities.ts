import type { Feature, Point as GeoPoint } from 'geojson';
import type { Point } from '../types.ts';

export type FacilityCategory = 'kesehatan' | 'pendidikan' | 'ibadah' | 'pemerintahan' | 'ekonomi' | 'transportasi';
export type FacilityProperties = { id: string; name: string; category: FacilityCategory; kind: string; district: string };
export type FacilityFeature = Feature<GeoPoint, FacilityProperties>;
export type NearbyFacility = FacilityProperties & { lat: number; lng: number; distance: number };

export const FACILITY_CATEGORIES: Record<FacilityCategory, string> = {
  kesehatan: 'Kesehatan',
  pendidikan: 'Pendidikan',
  ibadah: 'Tempat ibadah',
  pemerintahan: 'Pemerintahan',
  ekonomi: 'Pasar dan bank',
  transportasi: 'Transportasi',
};

// OSM tag value → [category, label]. Order matters: the first matching tag wins.
const RULES: [key: string, values: Record<string, [FacilityCategory, string]>][] = [
  ['amenity', {
    hospital: ['kesehatan', 'Rumah sakit'], clinic: ['kesehatan', 'Klinik atau puskesmas'], doctors: ['kesehatan', 'Praktik dokter'],
    dentist: ['kesehatan', 'Dokter gigi'], pharmacy: ['kesehatan', 'Apotek'],
    school: ['pendidikan', 'Sekolah'], kindergarten: ['pendidikan', 'TK/PAUD'], college: ['pendidikan', 'Perguruan tinggi'],
    university: ['pendidikan', 'Perguruan tinggi'],
    place_of_worship: ['ibadah', 'Tempat ibadah'],
    townhall: ['pemerintahan', 'Kantor pemerintahan'], police: ['pemerintahan', 'Kantor polisi'],
    fire_station: ['pemerintahan', 'Pemadam kebakaran'], post_office: ['pemerintahan', 'Kantor pos'],
    courthouse: ['pemerintahan', 'Pengadilan'],
    marketplace: ['ekonomi', 'Pasar'], bank: ['ekonomi', 'Bank'],
    bus_station: ['transportasi', 'Terminal bus'],
  }],
  ['healthcare', {
    hospital: ['kesehatan', 'Rumah sakit'], centre: ['kesehatan', 'Puskesmas'], clinic: ['kesehatan', 'Klinik atau puskesmas'],
    doctor: ['kesehatan', 'Praktik dokter'], pharmacy: ['kesehatan', 'Apotek'], midwife: ['kesehatan', 'Bidan'],
  }],
  ['office', { government: ['pemerintahan', 'Kantor pemerintahan'] }],
  ['railway', { station: ['transportasi', 'Stasiun kereta'], halt: ['transportasi', 'Halte kereta'] }],
];

export function classifyFacility(tags: Record<string, string | undefined>) {
  for (const [key, values] of RULES) {
    const value = tags[key];
    if (!value || !Object.hasOwn(values, value)) continue;
    const [category, kind] = values[value];
    // Community health centres are often tagged as hospitals in Kebumen; the name is more reliable.
    if (category === 'kesehatan' && /\bpuskesmas\b/i.test(tags.name ?? '')) return { category, kind: 'Puskesmas' };
    return { category, kind };
  }
  return null;
}

/** Overpass filters for every tag in RULES, so the export and the classifier stay in sync. */
export function overpassFilters() {
  return RULES.map(([key, values]) => `["${key}"~"^(${Object.keys(values).join('|')})$"]`);
}

const compactName = (name: string) => name.toLocaleLowerCase('id-ID').replace(/[^\p{L}\p{N}]/gu, '');

/**
 * OSM often maps one facility twice (a point and its building) or once per building.
 * Keep the first facility of each type and name within the given distance; unnamed ones stay.
 */
export function dedupeFacilities(features: FacilityFeature[], within = 300) {
  const seen = new Map<string, Point[]>();
  return features.filter(({ geometry, properties }) => {
    const name = compactName(properties.name);
    if (!name) return true;
    const key = `${properties.kind}|${name}`;
    const point = { lat: geometry.coordinates[1], lng: geometry.coordinates[0] };
    const previous = seen.get(key) ?? [];
    if (previous.some((other) => distanceMeters(point, other) <= within)) return false;
    seen.set(key, [...previous, point]);
    return true;
  });
}

/** Great-circle distance in metres. */
export function distanceMeters(a: Point, b: Point) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
}

export function nearestFacilities(features: FacilityFeature[], point: Point, radius: number, limit: number): NearbyFacility[] {
  return features
    .map(({ geometry, properties }) => {
      const [lng, lat] = geometry.coordinates;
      return { ...properties, lat, lng, distance: distanceMeters(point, { lat, lng }) };
    })
    .filter((facility) => facility.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`;
}
