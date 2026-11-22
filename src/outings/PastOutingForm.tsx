import { useState, type FormEvent } from 'react';
import { OUTING_MODE_LABEL, type NewOuting, type OutingMode, type Profile } from '../data/types';

function localDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/** Apuntar una jornada que ya pasó: día, horas, modalidad y compañeros. */
export function PastOutingForm({ friends, onSave, onCancel }: { friends: Profile[]; onSave(o: NewOuting): Promise<void>; onCancel(): void }) {
  const [day, setDay] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [mode, setMode] = useState<OutingMode>('surfcasting');
  const [companions, setCompanions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!day || !from || !to) return setError('Indica el día y las horas.');
    const start = localDateTime(day, from);
    const end = localDateTime(day, to);
    if (end <= start) return setError('La hora de fin tiene que ser posterior a la de inicio.');
    if (start > new Date()) return setError('Esa fecha todavía no ha llegado.');
    setBusy(true);
    setError(null);
    try {
      await onSave({
        id: crypto.randomUUID(),
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        mode,
        companionIds: companions,
        location: null,
        shareExact: false,
        note: note.trim() || undefined,
      });
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
      <label className="field">
        Nota
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sitio, condiciones, anécdotas…" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>Guardar jornada</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
