export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(Math.max(0, level - 1), 1.5));
}

const TITLES: [number, string][] = [
  [40, 'Leyenda'],
  [25, 'Señor del Estrecho'],
  [15, 'Lobo de mar'],
  [10, 'Caña fina'],
  [5, 'Pescador de espigón'],
  [1, 'Grumete'],
];

export function titleForLevel(level: number): string {
  return TITLES.find(([min]) => level >= min)![1];
}

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const start = xpForLevel(level);
  return { level, title: titleForLevel(level), xpIntoLevel: xp - start, xpForNext: xpForLevel(level + 1) - start };
}
