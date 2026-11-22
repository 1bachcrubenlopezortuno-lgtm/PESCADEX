import { levelInfo, xpForLevel } from './levels';

test('umbrales de nivel', () => {
  expect(xpForLevel(1)).toBe(0);
  expect(xpForLevel(2)).toBe(100);
  expect(xpForLevel(5)).toBe(800);
  expect(xpForLevel(10)).toBe(2700);
});

test('levelInfo', () => {
  expect(levelInfo(0)).toEqual({ level: 1, title: 'Grumete', xpIntoLevel: 0, xpForNext: 100 });
  expect(levelInfo(800)).toMatchObject({ level: 5, title: 'Pescador de espigón' });
  expect(levelInfo(799).level).toBe(4);
  expect(levelInfo(xpForLevel(10)).title).toBe('Caña fina');
  expect(levelInfo(xpForLevel(15)).title).toBe('Lobo de mar');
  expect(levelInfo(xpForLevel(25)).title).toBe('Señor del Estrecho');
  expect(levelInfo(xpForLevel(40)).title).toBe('Leyenda');
});
