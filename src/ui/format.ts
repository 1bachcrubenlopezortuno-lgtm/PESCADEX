const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthsLabel(months: number[]): string {
  if (months.length === 12) return 'Todo el año';
  const set = new Set(months);
  // agrupa en rangos circulares
  const start = [...set].find((m) => !set.has(m === 1 ? 12 : m - 1)) ?? months[0];
  const ranges: [number, number][] = [];
  let m = start;
  for (let i = 0; i < 12; i++) {
    if (set.has(m)) {
      if (ranges.length && ranges[ranges.length - 1][1] === (m === 1 ? 12 : m - 1)) ranges[ranges.length - 1][1] = m;
      else ranges.push([m, m]);
    }
    m = m === 12 ? 1 : m + 1;
  }
  return ranges.map(([a, b]) => (a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]}–${MONTHS[b - 1]}`)).join(', ');
}

export function formatWeight(g: number): string {
  return g >= 1000 ? `${(g / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg` : `${g} g`;
}

export function formatLength(cm: number): string {
  return `${cm.toLocaleString('es-ES')} cm`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
