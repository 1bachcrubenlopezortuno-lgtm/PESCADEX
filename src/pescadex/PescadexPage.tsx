import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useCatalog } from '../catalog/CatalogProvider';
import { RARITIES, RARITY_LABEL, type Habitat, type Rarity } from '../catalog/types';
import { listOutings, toGameCatch } from '../data/api';
import { levelInfo } from '../game/levels';
import { isValidCatch, totalXp } from '../game/xp';
import { pescadexProgress, unlockedSpeciesIds } from '../game/pescadex';
import { Avatar } from '../ui/Avatar';
import { SpeciesCard } from './SpeciesCard';
import { useMyCatches } from './useMyCatches';

type Status = 'todas' | 'capturadas' | 'pendientes';

export function PescadexPage() {
  const { profile } = useAuth();
  const { catches, loading, error } = useMyCatches(profile!.id);
  const { species: SPECIES } = useCatalog();
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [rarity, setRarity] = useState<Rarity | ''>('');
  const [status, setStatus] = useState<Status>('todas');

  const [outingCount, setOutingCount] = useState(0);
  useEffect(() => {
    listOutings({ userId: profile!.id }).then((o) => setOutingCount(o.length)).catch(() => {});
  }, [profile]);

  const game = useMemo(() => catches.map(toGameCatch), [catches]);
  const unlocked = useMemo(() => unlockedSpeciesIds(game), [game]);
  const progress = pescadexProgress(unlocked);
  // Tu mejor foto de cada especie: la de la pieza más pesada (o la más reciente).
  const photos = useMemo(() => {
    const best = new Map<string, { url: string; w: number }>();
    for (const c of catches) {
      const url = c.photoUrls.find(Boolean);
      if (!url || !isValidCatch(toGameCatch(c))) continue;
      const w = c.weightG ?? 0;
      const b = best.get(c.speciesId);
      if (!b || w > b.w) best.set(c.speciesId, { url, w });
    }
    return best;
  }, [catches]);
  const lvl = levelInfo(totalXp(game, outingCount));

  const visible = SPECIES.filter(
    (s) =>
      (!habitat || s.habitats.includes(habitat)) &&
      (!rarity || s.rarity === rarity) &&
      (status === 'todas' || (status === 'capturadas') === unlocked.has(s.id)),
  );

  return (
    <div>
      <header className="pescadex-header">
        <Avatar profile={profile!} size={46} />
        <div className="who">
          <h1>Pescadex</h1>
          <p className="level">{`Nv. ${lvl.level} · ${lvl.title}`}</p>
        </div>
        <div className="ring" style={{ ['--p' as string]: progress.percent }} aria-hidden="true"><span>{progress.percent}%</span></div>
      </header>
      {!loading && (
        <div className="progress">
          <div className="progress-bar"><div style={{ width: `${progress.percent}%` }} /></div>
          <span>{`${progress.unlocked}/${progress.total} (${progress.percent}%)`}</span>
        </div>
      )}
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
        {visible.map((s) => <SpeciesCard key={s.id} species={s} unlocked={unlocked.has(s.id)} photoUrl={photos.get(s.id)?.url} />)}
      </div>
    </div>
  );
}
