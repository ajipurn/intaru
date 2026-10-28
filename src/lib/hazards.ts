// InaRISK (BNPB) hazard index rasters. The services publish no year or licence,
// so the interface states that instead of assuming one.
export const INARISK_URL = 'https://gis.bnpb.go.id/server/rest/services/inarisk';
export const INARISK_ATTRIBUTION = 'Indeks bahaya &copy; <a href="https://inarisk.bnpb.go.id/">InaRISK BNPB</a>';

export const HAZARDS = [
  { id: 'banjir', label: 'Banjir', service: 'layer_bahaya_banjir' },
  { id: 'tanah-longsor', label: 'Tanah longsor', service: 'layer_bahaya_tanah_longsor' },
  { id: 'tsunami', label: 'Tsunami', service: 'layer_bahaya_tsunami' },
] as const;
export type HazardId = (typeof HAZARDS)[number]['id'];
export type Hazard = (typeof HAZARDS)[number];

export const hazardById = (id: unknown) => HAZARDS.find((hazard) => hazard.id === id) ?? null;

// Sampled from the service's own rendering over Kebumen, from index 0 (low) to 1 (high).
export const HAZARD_RAMP = ['#44af00', '#c8d100', '#feb200', '#ff6400', '#ff0000'];

const WORLD = 20037508.342789244;

/** Web Mercator bounds of an XYZ tile: [xmin, ymin, xmax, ymax]. */
export function tileBounds(x: number, y: number, z: number): [number, number, number, number] {
  const span = (2 * WORLD) / 2 ** z;
  const xmin = -WORLD + x * span;
  const ymax = WORLD - y * span;
  return [xmin, ymax - span, xmin + span, ymax];
}

export function hazardTileUrl(hazard: Hazard, x: number, y: number, z: number, size = 256) {
  const params = new URLSearchParams({
    bbox: tileBounds(x, y, z).join(','),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${size},${size}`,
    format: 'png32',
    transparent: 'true',
    f: 'image',
  });
  return `${INARISK_URL}/${hazard.service}/ImageServer/exportImage?${params}`;
}
