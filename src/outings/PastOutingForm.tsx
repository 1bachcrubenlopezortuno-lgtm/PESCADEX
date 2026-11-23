import { useState, type FormEvent } from 'react';
import type { Species } from '../catalog/types';
import { SpeciesPicker } from '../catches/SpeciesPicker';
import { OUTING_MODE_LABEL, type LatLng, type NewOuting, type OutingMode, type Profile } from '../data/types';
import { MapPicker } from '../ui/MapPicker';

export interface PastCatch {
  speciesId: string;
  weightG?: number;
  lengthCm?: number;
  bait?: string;
  photo?: File;
}

interface Row {
  key: number;
  species: Species | null;
  weight: string;
  length: string;
  bait: string;
  photo: File | null;
}

function localDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

const toNumber = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

let nextKey = 0;
const emptyRow = (): Row => ({ key: nextKey++, species: null, weight: '', length: '', bait: '', photo: null });

/** Apuntar una jornada que ya pasó: día, horas, sitio, participantes y lo que se pescó. */
export function PastOutingForm({ friends, onSave, onCancel }: { friends: Profile[]; onSave(o: NewOuting, catches: PastCatch[]): Promise<void>; onCancel(): void }) {
  const [day, setDay] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<OutingMode>('surfcasting');
  const [companions, setCompanions] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!day || !from || !to) return setError('Indica el día y las horas.');
    const start = localDateTime(day, from);
    const end = localDateTime(day, to);
    if (end <= start) return setError('La hora de fin tiene que ser posterior a la de inicio.');
    if (start > new Date()) return setError('Esa fecha todavía no ha llegado.');
    if (rows.some((r) => !r.species)) return setError('Elige la especie de cada pez o quita la fila.');
    setBusy(true);
    setError(null);
    try {
      await onSave(
        {
          id: crypto.randomUUID(),
          startedAt: start.toISOString(),
          endedAt: end.toISOString(),
          mode,
          companionIds: companions,
          location,
          shareExact: false,
          note: note.trim() || undefined,
          placeName: placeName.trim() || undefined,
        },
        rows.map((r) => {
          const kg = toNumber(r.weight);
          return {
            speciesId: r.species!.id,
            weightG: kg ? Math.round(kg * 1000) : undefined,
            lengthCm: toNumber(r.length),
            bait: r.bait.trim() || undefined,
            photo: r.photo ?? undefined,
          };
        }),
      );
    } catch {
      setError('No se pudo guardar la jornada. Revisa la conexión.');
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>Jornada pasada</h2>
      <label className="field">
        Día
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </label>
      <div className="row two">
        <label className="field">
          Desde
          <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          Hasta
          <input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <label className="field">
        Modalidad
        <select value={mode} onChange={(e) => setMode(e.target.value as OutingMode)}>
          {Object.entries(OUTING_MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>

      <span className="field">Sitio</span>
      <MapPicker value={location} onChange={setLocation} />
      <label className="field">
        Nombre del sitio
        <input value={placeName} maxLength={80} onChange={(e) => setPlaceName(e.target.value)} placeholder="Playa de la Fontanilla, embalse de Arcos…" />
      </label>

      {friends.length > 0 && (
        <fieldset className="field">
          <legend>Participantes</legend>
          {friends.map((f) => (
            <label key={f.id} className="check">
              <input
                type="checkbox"
                checked={companions.includes(f.id)}
                onChange={(e) => setCompanions(e.target.checked ? [...companions, f.id] : companions.filter((x) => x !== f.id))}
              />
              {f.displayName}
            </label>
          ))}
        </fieldset>
      )}

      <span className="field">Lo que pescaste</span>
      {rows.map((r, i) => (
        <div key={r.key} className="past-catch" data-testid={`past-catch-${i}`}>
          <div className="past-catch-head">
            <strong>Pez {i + 1}</strong>
            <button type="button" className="link-btn" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Quitar</button>
          </div>
          <SpeciesPicker value={r.species} onChange={(s) => update(r.key, { species: s })} />
          <div className="row two">
            <label className="field">
              Peso (kg)
              <input inputMode="decimal" value={r.weight} onChange={(e) => update(r.key, { weight: e.target.value })} placeholder="1,2" />
            </label>
            <label className="field">
              Medida (cm)
              <input inputMode="decimal" value={r.length} onChange={(e) => update(r.key, { length: e.target.value })} placeholder="35" />
            </label>
          </div>
          <label className="field">
            Cebo / señuelo
            <input value={r.bait} onChange={(e) => update(r.key, { bait: e.target.value })} />
          </label>
          <label className="field">
            Foto
            <input type="file" accept="image/*" onChange={(e) => update(r.key, { photo: e.target.files?.[0] ?? null })} />
          </label>
          {!r.photo && <p className="muted small">Sin foto se guarda, pero no da XP ni desbloquea la especie.</p>}
        </div>
      ))}
      <button type="button" className="btn secondary block" onClick={() => setRows((rs) => [...rs, emptyRow()])}>Añadir pez</button>

      <label className="field" style={{ marginTop: 14 }}>
        Nota
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condiciones, anécdotas…" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar jornada'}</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
