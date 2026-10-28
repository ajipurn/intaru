import { useEffect, useRef } from 'react';

/** Lets long-lived Leaflet handlers read the current value without being recreated. */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
