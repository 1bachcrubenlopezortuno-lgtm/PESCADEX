import { catchXpEvents, isValidCatch, totalXp, type GameCatch } from './xp';

let n = 0;
const c = (over: Partial<GameCatch>): GameCatch => ({
  id: `c${++n}`,
  speciesId: 'dorada',
  caughtAt: `2026-01-0${n % 9 + 1}T10:00:00Z`,
  photoCount: 1,
  weightG: null,
  lengthCm: null,
  ...over,
});

describe('isValidCatch', () => {
  test('sin foto no es válida', () => {
    expect(isValidCatch(c({ photoCount: 0 }))).toBe(false);
  });
  test('especie protegida con foto no es válida', () => {
    expect(isValidCatch(c({ speciesId: 'anguila' }))).toBe(false);
  });
  test('dorada con foto es válida', () => {
    expect(isValidCatch(c({}))).toBe(true);
  });
});

describe('catchXpEvents', () => {
  test('primera de la especie ×3, la siguiente base', () => {
    const ev = catchXpEvents([
      c({ caughtAt: '2026-01-01T10:00:00Z', weightG: 800 }),
      c({ caughtAt: '2026-01-02T10:00:00Z', weightG: 500 }),
    ]);
    expect(ev.map((e) => e.xp)).toEqual([75, 25]);
    expect(ev[0].firstOfSpecies).toBe(true);
    expect(ev[1].record).toBe(false);
  });

  test('récord de peso suma +50% de la base', () => {
    const ev = catchXpEvents([
      c({ caughtAt: '2026-01-01T10:00:00Z', weightG: 800 }),
      c({ caughtAt: '2026-01-02T10:00:00Z', weightG: 500 }),
      c({ caughtAt: '2026-01-03T10:00:00Z', weightG: 900 }),
    ]);
    expect(ev[2]).toMatchObject({ xp: 38, record: true });
  });

  test('récord por medida cuando no hay peso', () => {
    const ev = catchXpEvents([
      c({ caughtAt: '2026-01-01T10:00:00Z', lengthCm: 30 }),
      c({ caughtAt: '2026-01-02T10:00:00Z', lengthCm: 35 }),
    ]);
    expect(ev[1]).toMatchObject({ xp: 38, record: true });
  });

  test('una captura sin foto no genera evento ni cuenta como primera', () => {
    const ev = catchXpEvents([
      c({ caughtAt: '2026-01-01T10:00:00Z', photoCount: 0 }),
      c({ caughtAt: '2026-01-02T10:00:00Z' }),
    ]);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ xp: 75, firstOfSpecies: true });
  });

  test('ordena por fecha de captura aunque lleguen desordenadas', () => {
    const late = c({ caughtAt: '2026-02-01T10:00:00Z' });
    const early = c({ caughtAt: '2026-01-01T10:00:00Z' });
    const ev = catchXpEvents([late, early]);
    expect(ev[0].catchId).toBe(early.id);
    expect(ev[0].xp).toBe(75);
  });
});

test('totalXp suma 5 por jornada', () => {
  expect(totalXp([], 3)).toBe(15);
  expect(totalXp([c({})], 2)).toBe(85);
});
