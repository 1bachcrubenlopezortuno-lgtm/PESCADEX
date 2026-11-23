import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID } from '../catalog/catalog';
import { listOutings, listProfiles, toGameCatch, updateMyAvatar, updateMyName } from '../data/api';
import { Avatar } from '../ui/Avatar';
import type { Outing, Profile } from '../data/types';
import { levelInfo } from '../game/levels';
import { pescadexProgress, unlockedSpeciesIds } from '../game/pescadex';
import { isValidCatch, totalXp } from '../game/xp';
import { useMyCatches } from '../pescadex/useMyCatches';
import { formatDateTime, formatLength, formatWeight } from '../ui/format';

export function ProfilePage() {
  const { userId } = useParams();
  const { profile: me, signOut, refresh } = useAuth();
  const id = userId ?? me!.id;
  const own = id === me!.id;
  const { catches, loading } = useMyCatches(id);
  const [outings, setOutings] = useState<Outing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  useEffect(() => {
    listOutings({ userId: id }).then(setOutings).catch(() => setOutings([]));
    listProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, [id]);

  const person = own ? { ...me!, ...(profiles.find((p) => p.id === id) ?? {}) } : profiles.find((p) => p.id === id);
  const myPhotos = own
    ? catches.flatMap((c) => c.photoPaths.map((path, i) => ({ path, url: c.photoUrls[i], speciesId: c.speciesId }))).filter((x) => x.url)
    : [];
  const game = useMemo(() => catches.map(toGameCatch), [catches]);
  const xp = totalXp(game, outings.length);
  const lvl = levelInfo(xp);
  const progress = pescadexProgress(unlockedSpeciesIds(game));

  const records = useMemo(() => {
    const best = new Map<string, { weightG: number | null; lengthCm: number | null; catchId: string }>();
    for (const c of catches) {
      if (!isValidCatch(toGameCatch(c))) continue;
      const b = best.get(c.speciesId);
      if (!b || (c.weightG ?? 0) > (b.weightG ?? 0) || (!b.weightG && (c.lengthCm ?? 0) > (b.lengthCm ?? 0))) {
        best.set(c.speciesId, { weightG: c.weightG, lengthCm: c.lengthCm, catchId: c.id });
      }
    }
    return [...best.entries()]
      .filter(([, b]) => b.weightG || b.lengthCm)
      .sort((a, b) => (b[1].weightG ?? 0) - (a[1].weightG ?? 0))
      .slice(0, 5);
  }, [catches]);

  if (!person) return <p className="muted">{loading ? 'Cargando…' : 'Perfil no encontrado.'}</p>;

  async function chooseAvatar(path: string | null) {
    setAvatarError(null);
    try {
      await updateMyAvatar(path);
      await refresh();
      setProfiles(await listProfiles());
      setChoosing(false);
    } catch {
      setAvatarError('No se pudo cambiar la foto. Inténtalo de nuevo.');
    }
  }

  async function saveName() {
    if (!name.trim()) return;
    await updateMyName(name);
    await refresh();
    setEditing(false);
  }

  return (
    <div className="profile">
      <div className="profile-head card">
        <Avatar profile={person} size={72} />
        <div className="grow">
          {editing ? (
            <div className="row">
              <input aria-label="Nombre" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <button className="btn" onClick={() => void saveName()}>Guardar</button>
            </div>
          ) : (
            <h1>{person.displayName}</h1>
          )}
          <p className="level">{`Nv. ${lvl.level} · ${lvl.title}`}</p>
          <div className="xp-bar"><div style={{ width: `${Math.round((100 * lvl.xpIntoLevel) / lvl.xpForNext)}%` }} /></div>
          <p className="muted small">{`${lvl.xpIntoLevel}/${lvl.xpForNext} XP`}</p>
          <p>{`Pescadex: ${progress.unlocked}/${progress.total} (${progress.percent}%)`}</p>
          <p className="muted small">{outings.length} {outings.length === 1 ? 'jornada' : 'jornadas'} · {catches.length} {catches.length === 1 ? 'captura' : 'capturas'}</p>
        </div>
      </div>

      {own && !choosing && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={() => setChoosing(true)}>Cambiar foto</button>
          {person.avatarPath && <button className="btn secondary" onClick={() => void chooseAvatar(null)}>Quitar foto</button>}
        </div>
      )}
      {own && choosing && (
        <div className="card" style={{ marginTop: 12 }}>
          <strong>Elige tu foto de perfil</strong>
          {myPhotos.length ? (
            <div className="gallery avatar-choices" role="group" aria-label="Tus fotos">
              {myPhotos.map((ph) => {
                const sp = SPECIES_BY_ID[ph.speciesId]?.commonName ?? 'tu captura';
                return (
                  <button key={ph.path} type="button" className="gallery-item" aria-label={`Usar foto de ${sp}`} onClick={() => void chooseAvatar(ph.path)}>
                    <img src={ph.url} alt={`Foto de ${sp}`} loading="lazy" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="muted">Aún no has subido fotos. Registra una captura con foto y podrás usarla aquí.</p>
          )}
          {avatarError && <p className="error">{avatarError}</p>}
          <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => setChoosing(false)}>Cancelar</button>
        </div>
      )}

      <h2>Récords</h2>
      {records.length ? (
        <ul className="list">
          {records.map(([sid, r]) => (
            <li key={sid}>
              <Link to={`/captura/${r.catchId}`}>{SPECIES_BY_ID[sid]?.commonName}</Link>
              {': '}
              {[r.weightG && formatWeight(r.weightG), r.lengthCm && formatLength(r.lengthCm)].filter(Boolean).join(' · ')}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Aún sin récords (apunta peso o medida en tus capturas).</p>
      )}

      <h2>Últimas capturas</h2>
      <ul className="list">
        {catches.slice(0, 10).map((c) => (
          <li key={c.id}>
            <Link to={`/captura/${c.id}`}>{SPECIES_BY_ID[c.speciesId]?.commonName ?? c.speciesId}</Link>
            <span className="muted"> · {formatDateTime(c.caughtAt)}{c.photoUrls.length === 0 ? ' · sin foto' : ''}</span>
          </li>
        ))}
        {catches.length === 0 && <li className="muted">Todavía nada. ¡A pescar!</li>}
      </ul>

      <h2>El grupo</h2>
      <ul className="list">
        {profiles.filter((p) => p.id !== id).map((p) => (
          <li key={p.id}><Link to={`/perfil/${p.id}`}>{p.displayName}</Link></li>
        ))}
      </ul>

      {own && (
        <div className="row" style={{ marginTop: 24 }}>
          {!editing && <button className="btn secondary" onClick={() => { setName(person.displayName); setEditing(true); }}>Cambiar nombre</button>}
          <button className="btn secondary" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
