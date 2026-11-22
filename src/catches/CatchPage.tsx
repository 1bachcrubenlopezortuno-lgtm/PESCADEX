import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID } from '../catalog/catalog';
import { RARITY_LABEL } from '../catalog/types';
import { addCatchPhoto, deleteCatch, getCatch, listProfiles } from '../data/api';
import { ConfirmBox } from '../ui/ConfirmBox';
import { preparePhoto } from '../data/photo';
import type { Catch, Profile } from '../data/types';
import { formatDateTime, formatLength, formatWeight } from '../ui/format';
import { LocationLine } from '../ui/LocationLine';

export function CatchPage() {
  const { id = '' } = useParams();
  const { profile } = useAuth();
  const [c, setC] = useState<Catch | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    getCatch(id).then(setC).catch(() => setError('No se encontró la captura.'));
  }, [id]);
  useEffect(() => {
    load();
    listProfiles().then(setProfiles).catch(() => {});
  }, [load]);

  async function addPhoto(files: FileList | null) {
    if (!files?.length || !c) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) await addCatchPhoto(c.id, await preparePhoto(f));
      load();
    } catch {
      setError('No se pudo subir la foto. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  if (!c) return error ? <p className="error">{error}</p> : <p className="muted">Cargando…</p>;
  const s = SPECIES_BY_ID[c.speciesId];
  const mine = c.userId === profile!.id;
  const author = profiles.find((p) => p.id === c.userId)?.displayName ?? '¿?';

  return (
    <div>
      <Link to={`/jornada/${c.outingId}`} className="muted">← Jornada</Link>
      <h1>{s?.commonName ?? c.speciesId}</h1>
      {s && <span className="tag" style={{ background: `var(--r-${s.rarity})`, color: '#fff' }}>{RARITY_LABEL[s.rarity]}</span>}
      <div className="photos">
        {c.photoUrls.filter(Boolean).map((u) => <img key={u} src={u} alt={`Foto de ${s?.commonName ?? 'la captura'}`} />)}
      </div>
      {c.photoUrls.length === 0 && <p className="tag warn">Sin foto · no puntúa</p>}
      {mine && (
        <label className="btn secondary block file-btn">
          {uploading ? 'Subiendo…' : 'Añadir foto'}
          <input type="file" accept="image/*" multiple hidden disabled={uploading} aria-label="Añadir foto" onChange={(e) => void addPhoto(e.target.files)} />
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <div className="card">
        <p><strong>Pescador:</strong> <Link to={`/perfil/${c.userId}`}>{author}</Link></p>
        <p><strong>Fecha:</strong> {formatDateTime(c.caughtAt)}</p>
        {c.weightG != null && <p><strong>Peso:</strong> {formatWeight(c.weightG)}</p>}
        {c.lengthCm != null && <p><strong>Medida:</strong> {formatLength(c.lengthCm)}</p>}
        {c.bait && <p><strong>Cebo / señuelo:</strong> {c.bait}</p>}
        {c.note && <p>{c.note}</p>}
        <LocationLine exact={c.exact} approx={c.approx} />
      </div>
      {mine && (
        <div className="danger-zone">
          {confirming ? (
            <ConfirmBox
              message="Se borrará esta captura y sus fotos. No se puede deshacer."
              onCancel={() => setConfirming(false)}
              onConfirm={async () => {
                await deleteCatch(c.id);
                navigate(`/jornada/${c.outingId}`, { replace: true });
              }}
            />
          ) : (
            <button className="btn ghost-danger block" onClick={() => setConfirming(true)}>Eliminar captura</button>
          )}
        </div>
      )}
    </div>
  );
}
