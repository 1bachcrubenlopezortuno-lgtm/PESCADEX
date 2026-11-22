import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES } from '../catalog/catalog';
import { RARITIES, RARITY_LABEL, type Habitat, type Rarity } from '../catalog/types';
import { toGameCatch } from '../data/api';
import { pescadexProgress, unlockedSpeciesIds } from '../game/pescadex';
import { SpeciesCard } from './SpeciesCard';
import { useMyCatches } from './useMyCatches';

type Status = 'todas' | 'capturadas' | 'pendientes';

export function PescadexPage() {
  const { profile } = useAuth();
  const { catches, loading, error } = useMyCatches(profile!.id);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [rarity, setRarity] = useState<Rarity | ''>('');
  const [status, setStatus] = useState<Status>('todas');

  const unlocked = useMemo(() => unlockedSpeciesIds(catches.map(toGameCatch)), [catches]);
  const progress = pescadexProgress(unlocked);

  const visible = SPECIES.filter(
    (s) =>
      (!habitat || s.habitats.includes(habitat)) &&
      (!rarity || s.rarity === rarity) &&
      (status === 'todas' || (status === 'capturadas') === unlocked.has(s.id)),
  );

  return (
    <div>
      <header className="pescadex-header">
        <h1>Pescadex</h1>
        {!loading && (
          <div className="progress">
            <div className="progress-bar"><div style={{ width: `${progress.percent}%` }} /></div>
            <span>{`${progress.unlocked}/${progress.total} (${progress.percent}%)`}</span>
          </div>
        )}
      </header>
      {error && <p className="error">{error}</p>}
      <div className="filters">
        {([['mar', 'Mar'], ['dulce', 'Agua dulce']] as const).map(([h, label]) => (
          <button key={h} className={`chip${habitat === h ? ' on' : ''}`} aria-pressed={habitat === h} onClick={() => setHabitat(habitat === h ? null : h)}>
            {label}
          </button>
        ))}
        <select aria-label="Rareza" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | '')}>
          <option value="">Todas las rarezas</option>
          {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
        </select>
        <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="todas">Todas</option>
          <option value="capturadas">Capturadas</option>
          <option value="pendientes">Pendientes</option>
        </select>
      </div>
      <div className="species-grid">
        {visible.map((s) => <SpeciesCard key={s.id} species={s} unlocked={unlocked.has(s.id)} />)}
      </div>
    </div>
  );
}
