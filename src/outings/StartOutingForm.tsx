import { useState, type FormEvent } from 'react';
import { OUTING_MODE_LABEL, type OutingMode, type Profile } from '../data/types';
import type { StartInput } from './useActiveOuting';

export function StartOutingForm({ friends, onStart, onCancel }: { friends: Profile[]; onStart(i: StartInput): Promise<unknown>; onCancel(): void }) {
  const [mode, setMode] = useState<OutingMode>('surfcasting');
  const [companions, setCompanions] = useState<string[]>([]);
  const [shareExact, setShareExact] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onStart({ mode, companionIds: companions, shareExact, note: note.trim() || undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Nueva jornada</h2>
      <label className="field">
        Modalidad
        <select value={mode} onChange={(e) => setMode(e.target.value as OutingMode)}>
          {Object.entries(OUTING_MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {friends.length > 0 && (
        <fieldset className="field">
          <legend>Compañeros</legend>
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
      <label className="check">
        <input type="checkbox" checked={shareExact} onChange={(e) => setShareExact(e.target.checked)} />
        Compartir ubicación exacta con el grupo
      </label>
      <label className="field">
        Nota
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Levante flojo, marea subiendo…" />
      </label>
      <div className="row">
        <button className="btn" disabled={busy}>Empezar</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
