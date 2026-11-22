import { useCallback } from 'react';
import type { LatLng } from '../data/types';

export const GEO_TIMEOUT_MS = 10_000;

/**
 * Pide la posición GPS. Devuelve null si se deniega, no hay señal o pasan 10 s.
 * El límite es propio: el `timeout` del navegador no cuenta mientras el permiso está sin responder.
 */
export function useGeolocation() {
  const request = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (!('geolocation' in navigator)) return resolve(null);
        const timer = setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
        const done = (v: LatLng | null) => {
          clearTimeout(timer);
          resolve(v);
        };
        navigator.geolocation.getCurrentPosition(
          (p) => done({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => done(null),
          { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
        );
      }),
    [],
  );
  return { request };
}
