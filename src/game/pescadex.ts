import { SPECIES, SPECIES_BY_ID } from '../catalog/catalog';
import type { Species } from '../catalog/types';
import { isValidCatch, type GameCatch } from './xp';

export function unlockedSpeciesIds(catches: GameCatch[], byId: Record<string, Species> = SPECIES_BY_ID): Set<string> {
  return new Set(catches.filter((c) => isValidCatch(c, byId)).map((c) => c.speciesId));
}

export function pescadexProgress(unlocked: Set<string>, catalog: Species[] = SPECIES) {
  const countable = catalog.filter((s) => s.legal !== 'protegida');
  const n = countable.filter((s) => unlocked.has(s.id)).length;
  return { unlocked: n, total: countable.length, percent: countable.length ? Math.round((100 * n) / countable.length) : 0 };
}
