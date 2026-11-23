import { SPECIES_BY_ID } from '../catalog/catalog';
import { toGameCatch } from '../data/api';
import type { Catch, Outing, Profile } from '../data/types';
import { levelInfo, type LevelInfo } from '../game/levels';
import { unlockedSpeciesIds } from '../game/pescadex';
import { isValidCatch, totalXp } from '../game/xp';

export interface Standing {
  profile: Profile;
  xp: number;
  level: LevelInfo;
  validCatches: number;
  species: number;
}

export function standings(profiles: Profile[], catches: Catch[], outings: Outing[]): Standing[] {
  return profiles.map((p) => {
    const mine = catches.filter((c) => c.userId === p.id).map(toGameCatch);
    const outingCount = outings.filter((o) => o.ownerId === p.id || o.companionIds.includes(p.id)).length;
    const xp = totalXp(mine, outingCount);
    return {
      profile: p,
      xp,
      level: levelInfo(xp),
      validCatches: mine.filter((c) => isValidCatch(c)).length,
      species: unlockedSpeciesIds(mine).size,
    };
  });
}

export interface RecordEntry {
  speciesId: string;
  catchId: string;
  userId: string;
  weightG: number | null;
  lengthCm: number | null;
}

/** La pieza más grande (por peso; si no hay peso, por medida) de cada especie, solo capturas válidas. */
export function speciesRecords(catches: Catch[]): RecordEntry[] {
  const best = new Map<string, RecordEntry>();
  for (const c of catches) {
    if (!isValidCatch(toGameCatch(c)) || (c.weightG == null && c.lengthCm == null)) continue;
    const b = best.get(c.speciesId);
    const better = !b || (c.weightG ?? 0) > (b.weightG ?? 0) || ((c.weightG ?? 0) === (b.weightG ?? 0) && (c.lengthCm ?? 0) > (b.lengthCm ?? 0));
    if (better) best.set(c.speciesId, { speciesId: c.speciesId, catchId: c.id, userId: c.userId, weightG: c.weightG, lengthCm: c.lengthCm });
  }
  return [...best.values()].sort((a, b) => (SPECIES_BY_ID[a.speciesId]?.commonName ?? '').localeCompare(SPECIES_BY_ID[b.speciesId]?.commonName ?? ''));
}
