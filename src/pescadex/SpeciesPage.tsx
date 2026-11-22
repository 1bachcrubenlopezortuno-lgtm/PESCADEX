import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID, speciesNumber } from '../catalog/catalog';
import { RARITY_LABEL } from '../catalog/types';
import { listProfiles, toGameCatch } from '../data/api';
import type { Profile } from '../data/types';
import { isValidCatch } from '../game/xp';
import { formatLength, formatWeight, monthsLabel } from '../ui/format';
import { FishSilhouette } from './FishSilhouette';
import { useCatches } from './useMyCatches';

export function SpeciesPage() {
  const { id = '' } = useParams();
  const { profile } = useAuth();
  const species = SPECIES_BY_ID[id];
  const { catches } = useCatches({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    listProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const valid = useMemo(
    () => catches.filter((c) => c.speciesId === id && isValidCatch(toGameCatch(c))),
    [catches, id],
  );
  if (!species) return <p>Especie no encontrada. <Link to="/">Volver</Link></p>;

  const mine = valid.filter((c) => c.userId === profile!.id);
  const unlocked = mine.length > 0;
  const locked = species.legal === 'protegida';
  const showName = unlocked || locked;
  const maxWeight = Math.max(0, ...mine.map((c) => c.weightG ?? 0));
  const maxLength = Math.max(0, ...mine.map((c) => c.lengthCm ?? 0));
  const holders = profiles.filter((p) => valid.some((c) => c.userId === p.id));

  return (
    <div className="species-page">
      <Link to="/" className="muted">← Pescadex</Link>
      <div className="species-hero" style={{ borderColor: unlocked ? `var(--r-${species.rarity})` : undefined }}>
        <FishSilhouette species={species} revealed={unlocked} size={120} />
        <div>
          <span className="muted">{speciesNumber(species.id)}</span>
          <h1>{showName ? species.commonName : '???'}</h1>
          {showName && <p className="muted"><em>{species.scientificName}</em></p>}
          <span className="tag" style={{ background: `var(--r-${species.rarity})`, color: '#fff' }}>{RARITY_LABEL[species.rarity]}</span>{' '}
          <span className="tag">{species.habitats.map((h) => (h === 'mar' ? 'Mar' : 'Agua dulce')).join(' · ')}</span>
        </div>
      </div>

      {species.legal !== 'libre' && (
        <div className={`card legal ${species.legal}`}>
          <strong>{locked ? '🔒 Especie protegida · no capturable' : '⚠️ Especie regulada'}</strong>
          <p>{species.legalNote}</p>
        </div>
      )}

      <div className="card">
        <p>{showName ? species.description : 'Todavía no has capturado esta especie. ¡Sal a buscarla!'}</p>
        <p><strong>Mejor época:</strong> {monthsLabel(species.bestMonths)}</p>
        <p><strong>Dónde:</strong> {species.zones}</p>
        <p className="muted">{species.group}</p>
      </div>

      {unlocked && (
        <>
          <h2>Mis capturas ({mine.length})</h2>
          <p>
            Récord: {maxWeight ? formatWeight(maxWeight) : '—'} · {maxLength ? formatLength(maxLength) : '—'}
          </p>
          <ul className="list">
            {mine.map((c) => (
              <li key={c.id}><Link to={`/captura/${c.id}`}>{new Date(c.caughtAt).toLocaleDateString('es-ES')}{c.weightG ? ` · ${formatWeight(c.weightG)}` : ''}</Link></li>
            ))}
          </ul>
        </>
      )}

      <h2>En el grupo</h2>
      {holders.length ? (
        <ul className="list">
          {holders.map((p) => <li key={p.id}><Link to={`/perfil/${p.id}`}>{p.displayName}</Link></li>)}
        </ul>
      ) : (
        <p className="muted">Nadie del grupo la ha capturado todavía.</p>
      )}
    </div>
  );
}
