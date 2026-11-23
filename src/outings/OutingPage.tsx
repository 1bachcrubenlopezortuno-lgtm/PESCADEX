import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID } from '../catalog/catalog';
import { deleteOuting, getOuting, listProfiles } from '../data/api';
import { OUTING_MODE_LABEL, type Catch, type Outing, type Profile } from '../data/types';
import { ConfirmBox } from '../ui/ConfirmBox';
import { formatDateTime, formatWeight } from '../ui/format';
import { LocationLine } from '../ui/LocationLine';

export function OutingPage() {
  const { id = '' } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<{ outing: Outing; catches: Catch[] } | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
  const me = profile!.id;
  const name = (uid: string) => profiles.find((p) => p.id === uid)?.displayName ?? '¿?';
  const isOwner = outing.ownerId === me;
  const isParticipant = isOwner || outing.companionIds.includes(me);
  const othersWithCatches = [...new Set(catches.filter((c) => c.userId !== outing.ownerId).map((c) => c.userId))];
  const ownCount = catches.length - catches.filter((c) => c.userId !== outing.ownerId).length;

  return (
    <div>
      <Link to="/cuaderno" className="muted">← Cuaderno</Link>
      <h1>{OUTING_MODE_LABEL[outing.mode]} · {formatDateTime(outing.startedAt)}</h1>
      <div className="card">
        {outing.placeName && <p><strong>Sitio:</strong> {outing.placeName}</p>}
        <p><strong>Participantes:</strong> {[outing.ownerId, ...outing.companionIds].map(name).join(', ')}</p>
        <p><strong>Duración:</strong> {outing.endedAt ? `hasta ${formatDateTime(outing.endedAt)}` : 'en curso'}</p>
        <LocationLine exact={outing.exact} approx={outing.approx} />
        {outing.note && <p>{outing.note}</p>}
      </div>

      <h2>Capturas ({catches.length})</h2>
      {isParticipant && <Link className="btn block" to={`/registrar?jornada=${outing.id}`}>Añadir captura</Link>}
      {catches.length === 0 && <p className="muted">Jornada en blanco. ¡Otra vez será!</p>}
      <ul className="list" style={{ marginTop: 12 }}>
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

      {isOwner && (
        <div className="danger-zone">
          {!confirming && <button className="btn ghost-danger block" onClick={() => setConfirming(true)}>Eliminar jornada</button>}
          {confirming && othersWithCatches.length > 0 && (
            <div className="card confirm">
              <p>
                {othersWithCatches.map(name).join(', ')} {othersWithCatches.length === 1 ? 'tiene' : 'tienen'} capturas en esta jornada.{' '}
                {othersWithCatches.length === 1 ? 'Tiene' : 'Tienen'} que eliminarlas antes de que puedas borrarla.
              </p>
              <button className="btn secondary" onClick={() => setConfirming(false)}>Entendido</button>
            </div>
          )}
          {confirming && othersWithCatches.length === 0 && (
            <ConfirmBox
              message={`Se borrará la jornada${ownCount ? ` y sus ${ownCount} ${ownCount === 1 ? 'captura' : 'capturas'}` : ''}. No se puede deshacer.`}
              onCancel={() => setConfirming(false)}
              onConfirm={async () => {
                await deleteOuting(outing.id);
                navigate('/cuaderno', { replace: true });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
