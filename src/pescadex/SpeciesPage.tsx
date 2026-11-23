import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID, speciesNumber } from '../catalog/catalog';
import { RARITY_LABEL } from '../catalog/types';
import { listProfiles, toGameCatch } from '../data/api';
import type { Profile } from '../data/types';
import { isValidCatch } from '../game/xp';
import { formatLength, formatWeight, monthsLabel } from '../ui/format';
import { SpeciesArt } from './SpeciesArt';
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
  const maxWeight = Math.max(0, ...mine.map((c) => c.weightG ?? 0));
  const maxLength = Math.max(0, ...mine.map((c) => c.lengthCm ?? 0));
  const holders = profiles.filter((p) => valid.some((c) => c.userId === p.id));
  const gallery = valid.flatMap((c) => c.photoUrls.filter(Boolean).map((url) => ({ url, c })));
  const heroPhoto = mine.flatMap((c) => c.photoUrls.filter(Boolean))[0];

  return (
    <div className="species-page">
      <Link to="/" className="muted">← Pescadex</Link>
      <div className={`species-hero${unlocked ? ' unlocked' : ''}`} style={{ ['--rc' as string]: `var(--r-${species.rarity})` }}>
        <SpeciesArt species={species} revealed={unlocked} size={112} photoUrl={heroPhoto} />
        <div>
          <span className="muted">{speciesNumber(species.id)}</span>
          <h1>{species.commonName}</h1>
          <p className="muted"><em>{species.scientificName}</em></p>
          <span className="tag rarity" style={{ ['--rc' as string]: `var(--r-${species.rarity})` }}>{RARITY_LABEL[species.rarity]}</span>{' '}
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
        <p>{species.description}</p>
        {!unlocked && !locked && <p className="hint">Todavía no la has capturado. ¡Sal a buscarla!</p>}
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

      <h2>Fotos del grupo ({gallery.length})</h2>
      {gallery.length ? (
        <div className="gallery">
          {gallery.map(({ url, c }) => {
            const who = profiles.find((p) => p.id === c.userId)?.displayName ?? '¿?';
            return (
              <Link key={url} to={`/captura/${c.id}`} className="gallery-item">
                <img src={url} alt={`${species.commonName} de ${who}`} loading="lazy" />
                <span>{who}{c.weightG ? ` · ${formatWeight(c.weightG)}` : ''}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="muted">Nadie ha subido todavía una foto de esta especie.</p>
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
