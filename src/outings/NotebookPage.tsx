import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { listCatches, listOutings, listProfiles } from '../data/api';
import { OUTING_MODE_LABEL, type Catch, type Outing, type Profile } from '../data/types';
import { formatDateTime } from '../ui/format';
import { StartOutingForm } from './StartOutingForm';
import { useActiveOuting } from './useActiveOuting';

export function NotebookPage() {
  const { profile } = useAuth();
  const me = profile!.id;
  const { active, start, end } = useActiveOuting();
  const [tab, setTab] = useState<'mias' | 'grupo'>('mias');
  const [outings, setOutings] = useState<Outing[]>([]);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listOutings({}), listCatches({}), listProfiles()])
      .then(([o, c, p]) => {
        setOutings(o);
        setCatches(c);
        setProfiles(p);
      })
      .catch(() => setError('No se pudo cargar el cuaderno.'));
  }, [active]);

  const names = useMemo(() => new Map(profiles.map((p) => [p.id, p.displayName])), [profiles]);
  const shown = tab === 'mias' ? outings.filter((o) => o.ownerId === me || o.companionIds.includes(me)) : outings;

  return (
    <div>
      <h1>Cuaderno</h1>
      {active ? (
        <div className="card active-outing">
          <strong>Jornada en curso</strong>
          <p className="muted">
            {OUTING_MODE_LABEL[active.mode]} · desde {formatDateTime(active.startedAt)}
          </p>
          <div className="row">
            <Link className="btn" to="/registrar">Registrar captura</Link>
            <Link className="btn secondary" to={`/jornada/${active.id}`}>Ver</Link>
            {active.ownerId === me && <button className="btn secondary" onClick={() => void end()}>Terminar jornada</button>}
          </div>
        </div>
      ) : showForm ? (
        <StartOutingForm
          friends={profiles.filter((p) => p.id !== me)}
          onCancel={() => setShowForm(false)}
          onStart={async (i) => {
            await start(i);
            setShowForm(false);
          }}
        />
      ) : (
        <button className="btn block" onClick={() => setShowForm(true)}>Empezar jornada</button>
      )}

      <div className="tabs">
        <button className={`chip${tab === 'mias' ? ' on' : ''}`} onClick={() => setTab('mias')}>Mías</button>
        <button className={`chip${tab === 'grupo' ? ' on' : ''}`} onClick={() => setTab('grupo')}>Grupo</button>
      </div>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {shown.map((o) => {
          const n = catches.filter((c) => c.outingId === o.id).length;
          const people = [o.ownerId, ...o.companionIds].map((id) => names.get(id) ?? '¿?').join(', ');
          return (
            <li key={o.id}>
              <Link className="card outing-row" to={`/jornada/${o.id}`}>
                <div>
                  <strong>{formatDateTime(o.startedAt)}</strong>
                  <div className="muted">{OUTING_MODE_LABEL[o.mode]} · {people}</div>
                </div>
                <span className="tag">{n === 0 ? 'En blanco' : `${n} ${n === 1 ? 'captura' : 'capturas'}`}</span>
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && <li className="muted">Todavía no hay jornadas.</li>}
      </ul>
    </div>
  );
}
