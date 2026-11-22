import { useCallback } from 'react';
import type { LatLng } from '../data/types';

/** Pide la posición GPS. Devuelve null si se deniega, no hay señal o tarda más de 10 s. */
export function useGeolocation() {
  const request = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (!('geolocation' in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      }),
    [],
  );
  return { request };
}
