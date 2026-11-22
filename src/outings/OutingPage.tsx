import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SPECIES_BY_ID } from '../catalog/catalog';
import { getOuting, listProfiles } from '../data/api';
import { OUTING_MODE_LABEL, type Catch, type Outing, type Profile } from '../data/types';
import { formatDateTime, formatWeight } from '../ui/format';
import { LocationLine } from '../ui/LocationLine';

export function OutingPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<{ outing: Outing; catches: Catch[] } | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getOuting(id), listProfiles()])
      .then(([d, p]) => {
        setData(d);
        setProfiles(p);
      })
      .catch(() => setError('No se encontró la jornada.'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;
  const { outing, catches } = data;
  const name = (uid: string) => profiles.find((p) => p.id === uid)?.displayName ?? '¿?';

  return (
    <div>
      <Link to="/cuaderno" className="muted">← Cuaderno</Link>
      <h1>{OUTING_MODE_LABEL[outing.mode]} · {formatDateTime(outing.startedAt)}</h1>
      <div className="card">
        <p><strong>Participantes:</strong> {[outing.ownerId, ...outing.companionIds].map(name).join(', ')}</p>
        <p><strong>Duración:</strong> {outing.endedAt ? `hasta ${formatDateTime(outing.endedAt)}` : 'en curso'}</p>
        <LocationLine exact={outing.exact} approx={outing.approx} />
        {outing.note && <p>{outing.note}</p>}
      </div>
      <h2>Capturas ({catches.length})</h2>
      {catches.length === 0 && <p className="muted">Jornada en blanco. ¡Otra vez será!</p>}
      <ul className="list">
        {catches.map((c) => (
          <li key={c.id}>
            <Link className="card outing-row" to={`/captura/${c.id}`}>
              <span>
                <strong>{SPECIES_BY_ID[c.speciesId]?.commonName ?? c.speciesId}</strong>
                <span className="muted"> · {name(c.userId)}{c.weightG ? ` · ${formatWeight(c.weightG)}` : ''}</span>
              </span>
              {c.photoUrls.length === 0 && <span className="tag">Sin foto</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
