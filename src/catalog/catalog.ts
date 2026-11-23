import data from './species.json';
import type { Species } from './types';

/** Catálogo base + especies añadidas por el grupo (se cargan al entrar con addSpecies). */
export const SPECIES: Species[] = [...(data as Species[])];
export const BASE_SPECIES_COUNT = SPECIES.length;

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export function addSpecies(list: Species[]): boolean {
  let added = false;
  for (const s of list) {
    if (SPECIES_BY_ID[s.id]) continue;
    SPECIES.push(s);
    SPECIES_BY_ID[s.id] = s;
    added = true;
  }
  return added;
}

export function capturable(s: Species): boolean {
  return s.legal !== 'protegida';
}

export function speciesNumber(id: string): string {
  const i = SPECIES.findIndex((s) => s.id === id);
  return `#${String(i + 1).padStart(3, '0')}`;
}

export const normalizeName = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');

export function findByName(name: string): Species | undefined {
  const n = normalizeName(name);
  return SPECIES.find((s) => normalizeName(s.commonName) === n);
}
