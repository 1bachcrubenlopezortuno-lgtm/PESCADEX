import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { GEO_TIMEOUT_MS, useGeolocation } from './useGeolocation';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('si nadie responde al permiso de GPS, devuelve null tras el tiempo límite', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: () => {} } });
  const { result } = renderHook(() => useGeolocation());
  const p = result.current.request();
  await vi.advanceTimersByTimeAsync(GEO_TIMEOUT_MS + 1);
  await expect(p).resolves.toBeNull();
});
