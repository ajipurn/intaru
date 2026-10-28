import { nearestFacilities } from './facilities';
import type { FacilityFeature, NearbyFacility } from './facilities';
import { containsPoint } from './geo';
import type { GeoData, Layer, LocationMatch, Point } from '../types';

type Request = { id: number; type: 'load'; path: string }
  | { id: number; type: 'identify'; point: Point; layers: Layer[] }
  | { id: number; type: 'nearby'; path: string; point: Point; radius: number; limit: number }
  | { id: number; type: 'cancel' };
const jobs = new Map<number, AbortController>();
// Every map click searches the same facilities, so keep them parsed.
const facilities = new Map<string, FacilityFeature[]>();

async function read(path: string, signal: AbortSignal): Promise<GeoData> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Data peta gagal dimuat (HTTP ${response.status}).`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const data = bytes[0] === 0x1f && bytes[1] === 0x8b
    ? await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
    : JSON.parse(new TextDecoder().decode(bytes));
  if (data.type !== 'FeatureCollection') throw new Error('Format data peta tidak valid.');
  return data;
}

self.onmessage = async ({ data: request }: MessageEvent<Request>) => {
  if (request.type === 'cancel') { jobs.get(request.id)?.abort(); return; }
  const controller = new AbortController();
  jobs.set(request.id, controller);
  try {
    let data: GeoData | LocationMatch[] | NearbyFacility[];
    if (request.type === 'load') data = await read(request.path, controller.signal);
    else if (request.type === 'nearby') {
      let features = facilities.get(request.path);
      if (!features) {
        features = (await read(request.path, controller.signal)).features as FacilityFeature[];
        facilities.set(request.path, features);
      }
      data = nearestFacilities(features, request.point, request.radius, request.limit);
    } else {
      const matches: LocationMatch[] = [];
      for (const layer of request.layers) {
        const bounds = layer.bounds;
        if (bounds && (request.point.lng < bounds[0] || request.point.lng > bounds[2] || request.point.lat < bounds[1] || request.point.lat > bounds[3])) continue;
        const original = await read(layer.asset_path, controller.signal);
        matches.push(...original.features.filter((feature) => containsPoint(feature.geometry, request.point)).slice(0, 4)
          .map((feature) => ({ layer_id: layer.id, layer_name: layer.name, properties: feature.properties })));
      }
      data = matches;
    }
    if (!controller.signal.aborted) self.postMessage({ id: request.id, data });
  } catch (error) {
    if (!controller.signal.aborted) self.postMessage({ id: request.id, error: error instanceof Error ? error.message : 'Data peta gagal diproses.' });
  } finally { jobs.delete(request.id); }
};
