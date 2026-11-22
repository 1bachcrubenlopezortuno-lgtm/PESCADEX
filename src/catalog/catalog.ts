import data from './species.json';
import type { Species } from './types';

export const SPECIES: Species[] = data as Species[];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
);

export function capturable(s: Species): boolean {
  return s.legal !== 'protegida';
}

export function speciesNumber(id: string): string {
  const i = SPECIES.findIndex((s) => s.id === id);
  return `#${String(i + 1).padStart(3, '0')}`;
}
