import { Link } from 'react-router-dom';
import { speciesNumber } from '../catalog/catalog';
import type { Species } from '../catalog/types';
import { FishSilhouette } from './FishSilhouette';

export function SpeciesCard({ species, unlocked }: { species: Species; unlocked: boolean }) {
  const locked = species.legal === 'protegida';
  const showName = unlocked || locked;
  return (
    <Link
      to={`/especie/${species.id}`}
      className={`species-card${unlocked ? ' unlocked' : ''}${locked ? ' locked' : ''}`}
      data-testid={`species-${species.id}`}
      style={unlocked ? { borderColor: `var(--r-${species.rarity})` } : undefined}
    >
      <span className="species-num">{speciesNumber(species.id)}</span>
      {locked && <span className="species-badge" title="Protegida">🔒</span>}
      {!locked && species.legal === 'regulada' && <span className="species-badge" title="Regulada">⚠️</span>}
      <FishSilhouette species={species} revealed={unlocked} />
      <span className="species-name">{showName ? species.commonName : '???'}</span>
    </Link>
  );
}
