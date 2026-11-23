import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useGeolocation } from '../catches/useGeolocation';
import type { LatLng } from '../data/types';

const ANDALUCIA: [number, number] = [37.3, -4.8];

/** Mapa para elegir un punto tocando (OpenStreetMap). */
export function MapPicker({ value, onChange }: { value: LatLng | null; onChange(p: LatLng): void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const { request } = useGeolocation();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(value ? [value.lat, value.lng] : ANDALUCIA, value ? 13 : 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const ll: [number, number] = [value.lat, value.lng];
    if (marker.current) marker.current.setLatLng(ll);
    else marker.current = L.circleMarker(ll, { radius: 10, color: '#36e0c2', weight: 3, fillColor: '#36e0c2', fillOpacity: 0.5 }).addTo(m);
  }, [value]);

  async function useMine() {
    setLocating(true);
    const p = await request();
    setLocating(false);
    if (p) {
      onChange(p);
      map.current?.setView([p.lat, p.lng], 14);
    }
  }

  return (
    <div className="map-picker">
      <div ref={box} className="map-box" />
      <div className="row">
        <button type="button" className="chip" onClick={() => void useMine()} disabled={locating}>
          {locating ? 'Buscando…' : 'Usar mi ubicación actual'}
        </button>
        {value && <span className="muted small">Punto marcado ✓</span>}
      </div>
      <p className="muted small">Toca en el mapa el sitio donde pescasteis.</p>
    </div>
  );
}
