import type { LatLng } from '../data/types';

export function LocationLine({ exact, approx }: { exact: LatLng | null; approx: LatLng | null }) {
  const p = exact ?? approx;
  if (!p) return <p className="muted">📍 Sin ubicación</p>;
  const href = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=${exact ? 15 : 12}/${p.lat}/${p.lng}`;
  return (
    <p>
      📍 <a href={href} target="_blank" rel="noreferrer">{exact ? 'Ubicación exacta' : 'Zona aproximada (~5 km)'}</a>
    </p>
  );
}
