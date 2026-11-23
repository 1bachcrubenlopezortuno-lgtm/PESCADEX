import { Link } from 'react-router-dom';
import { speciesNumber } from '../catalog/catalog';
import type { Species } from '../catalog/types';
import { SpeciesArt } from './SpeciesArt';

export function SpeciesCard({ species, unlocked, photoUrl }: { species: Species; unlocked: boolean; photoUrl?: string }) {
  const locked = species.legal === 'protegida';
  return (
    <Link
      to={`/especie/${species.id}`}
      className={`species-card${unlocked ? ' unlocked' : ''}${locked ? ' locked' : ''}`}
      data-testid={`species-${species.id}`}
      style={{ ['--rc' as string]: `var(--r-${species.rarity})` }}
    >
      <span className="species-num">{speciesNumber(species.id)}</span>
      {species.legal === 'regulada' && <span className="species-badge" title="Regulada">⚠️</span>}
      <SpeciesArt species={species} revealed={unlocked} size={56} photoUrl={photoUrl} />
      <span className="species-name">{species.commonName}</span>
    </Link>
  );
}
