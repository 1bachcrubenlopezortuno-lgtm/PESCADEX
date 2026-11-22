import { SPECIES } from '../catalog/catalog';
import { pescadexProgress, unlockedSpeciesIds } from './pescadex';
import type { GameCatch } from './xp';

const base: GameCatch = { id: 'a', speciesId: 'dorada', caughtAt: '2026-01-01T00:00:00Z', photoCount: 1, weightG: null, lengthCm: null };

test('total excluye protegidas y empieza en 0%', () => {
  const total = SPECIES.filter((s) => s.legal !== 'protegida').length;
  expect(pescadexProgress(new Set())).toEqual({ unlocked: 0, total, percent: 0 });
});

test('unlockedSpeciesIds ignora capturas sin foto', () => {
  const ids = unlockedSpeciesIds([base, { ...base, id: 'b', speciesId: 'sargo', photoCount: 0 }]);
  expect([...ids]).toEqual(['dorada']);
});

test('porcentaje redondeado', () => {
  const total = SPECIES.filter((s) => s.legal !== 'protegida').length;
  expect(pescadexProgress(new Set(['dorada'])).percent).toBe(Math.round(100 / total));
});
