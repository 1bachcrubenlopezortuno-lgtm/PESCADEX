import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { addCatchPhoto, createCatch, createOuting, listCatches, listOutings, listProfiles } from '../data/api';
import { preparePhoto } from '../data/photo';
import { OUTING_MODE_LABEL, type Catch, type Outing, type Profile } from '../data/types';
import { formatDateTime } from '../ui/format';
import { PastOutingForm } from './PastOutingForm';
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
  const [form, setForm] = useState<'none' | 'start' | 'past'>('none');
  const navigate = useNavigate();
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
      ) : form === 'start' ? (
        <StartOutingForm
          friends={profiles.filter((p) => p.id !== me)}
          onCancel={() => setForm('none')}
          onStart={async (i) => {
            await start(i);
            setForm('none');
          }}
        />
      ) : null}
      {form === 'past' && (
        <PastOutingForm
          friends={profiles.filter((p) => p.id !== me)}
          onCancel={() => setForm('none')}
          onSave={async (o, fish) => {
            await createOuting(o);
            for (const f of fish) {
              const id = crypto.randomUUID();
              await createCatch({ id, outingId: o.id, speciesId: f.speciesId, caughtAt: o.startedAt, weightG: f.weightG, lengthCm: f.lengthCm, bait: f.bait, gear: f.gear, shareExact: false, location: o.location });
              // Si la foto falla, la captura queda guardada "sin foto" y se puede añadir después.
              if (f.photo) await addCatchPhoto(id, await preparePhoto(f.photo)).catch(() => {});
            }
            navigate(`/jornada/${o.id}`);
          }}
        />
      )}
      {form === 'none' && (
        <div className="row stack">
          {!active && <button className="btn block" onClick={() => setForm('start')}>Empezar jornada</button>}
          <button className="btn secondary block" onClick={() => setForm('past')}>Apuntar jornada pasada</button>
        </div>
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
                  <div className="muted">{OUTING_MODE_LABEL[o.mode]}{o.placeName ? ` · ${o.placeName}` : ''} · {people}</div>
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
