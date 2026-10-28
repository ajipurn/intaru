import { lazy } from "react";
import type { ComponentType } from "react";

function lazyNamed<M extends Record<K, ComponentType<any>>, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

// The map engine and the sidebar load as separate chunks.
export const MapView = lazyNamed(() => import("../map/MapView"), "MapView");
export const Sidebar = lazyNamed(() => import("../sidebar/Sidebar"), "Sidebar");
