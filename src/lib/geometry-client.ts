import type { NearbyFacility } from './facilities';
import type { GeoData, Layer, LocationMatch, Point } from '../types';

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (data: unknown) => void; reject: (error: Error) => void; cleanup: () => void }>();

function request<T>(message: object, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  if (!worker) {
    worker = new Worker(new URL('./geometry.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const task = pending.get(data.id);
      if (!task) return;
      pending.delete(data.id); task.cleanup();
      if (data.error) task.reject(new Error(data.error)); else task.resolve(data.data);
    };
    worker.onerror = () => {
      for (const task of pending.values()) { task.cleanup(); task.reject(new Error('Pemrosesan peta terhenti. Silakan coba lagi.')); }
      pending.clear(); worker?.terminate(); worker = undefined;
    };
  }
  const id = ++nextId;
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      worker?.postMessage({ id, type: 'cancel' }); pending.delete(id);
      signal?.removeEventListener('abort', abort); reject(new DOMException('Aborted', 'AbortError'));
    };
    pending.set(id, { resolve: (data) => resolve(data as T), reject, cleanup: () => signal?.removeEventListener('abort', abort) });
    signal?.addEventListener('abort', abort, { once: true });
    worker!.postMessage({ ...message, id });
  });
}

export const readGeometry = (path: string, signal?: AbortSignal) => request<GeoData>({ type: 'load', path: new URL(path, location.href).href }, signal);
export const identifyGeometry = (point: Point, layers: Layer[], signal?: AbortSignal) => request<LocationMatch[]>({ type: 'identify', point, layers: layers.map((layer) => ({ ...layer, asset_path: new URL(layer.asset_path, location.href).href })) }, signal);
export const nearbyFacilities = (path: string, point: Point, radius: number, limit: number, signal?: AbortSignal) => request<NearbyFacility[]>({ type: 'nearby', path: new URL(path, location.href).href, point, radius, limit }, signal);
