import { SPECIES_BY_ID } from '../catalog/catalog';
import type { Rarity, Species } from '../catalog/types';

export interface GameCatch {
  id: string;
  speciesId: string;
  caughtAt: string;
  photoCount: number;
  weightG: number | null;
  lengthCm: number | null;
}

export const RARITY_XP: Record<Rarity, number> = {
  comun: 10,
  poco_comun: 25,
  rara: 50,
  epica: 100,
  legendaria: 250,
};

export const OUTING_XP = 5;

export function isValidCatch(c: GameCatch, byId: Record<string, Species> = SPECIES_BY_ID): boolean {
  const s = byId[c.speciesId];
  return !!s && s.legal !== 'protegida' && c.photoCount > 0;
}

export interface XpEvent {
  catchId: string;
  xp: number;
  firstOfSpecies: boolean;
  record: boolean;
}

export function catchXpEvents(catches: GameCatch[], byId: Record<string, Species> = SPECIES_BY_ID): XpEvent[] {
  const sorted = catches
    .filter((c) => isValidCatch(c, byId))
    .sort((a, b) => a.caughtAt.localeCompare(b.caughtAt) || a.id.localeCompare(b.id));
  const best = new Map<string, { weight: number | null; length: number | null }>();
  return sorted.map((c) => {
    const base = RARITY_XP[byId[c.speciesId].rarity];
    const prev = best.get(c.speciesId);
    if (!prev) {
      best.set(c.speciesId, { weight: c.weightG, length: c.lengthCm });
      return { catchId: c.id, xp: base * 3, firstOfSpecies: true, record: false };
    }
    const heavier = c.weightG != null && (prev.weight == null || c.weightG > prev.weight);
    const longer = c.lengthCm != null && (prev.length == null || c.lengthCm > prev.length);
    if (heavier) prev.weight = c.weightG;
    if (longer) prev.length = c.lengthCm;
    const record = heavier || longer;
    return { catchId: c.id, xp: base + (record ? Math.round(base * 0.5) : 0), firstOfSpecies: false, record };
  });
}

export function totalXp(catches: GameCatch[], outingCount: number, byId: Record<string, Species> = SPECIES_BY_ID): number {
  return catchXpEvents(catches, byId).reduce((sum, e) => sum + e.xp, 0) + OUTING_XP * outingCount;
}
