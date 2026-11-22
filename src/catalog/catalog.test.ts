import { SPECIES, SPECIES_BY_ID, capturable } from './catalog';
import { RARITIES } from './types';

describe('catálogo de especies', () => {
  test('tiene entre 70 y 90 especies con ids únicos tipo slug', () => {
    expect(SPECIES.length).toBeGreaterThanOrEqual(70);
    expect(SPECIES.length).toBeLessThanOrEqual(90);
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  test('cada especie tiene valores válidos', () => {
    for (const s of SPECIES) {
      expect(RARITIES, s.id).toContain(s.rarity);
      expect(['libre', 'regulada', 'protegida'], s.id).toContain(s.legal);
      expect(s.habitats.length, s.id).toBeGreaterThanOrEqual(1);
      for (const h of s.habitats) expect(['mar', 'dulce'], s.id).toContain(h);
      expect(s.bestMonths.length, s.id).toBeGreaterThan(0);
      for (const m of s.bestMonths) expect(m >= 1 && m <= 12, s.id).toBe(true);
      expect(s.description.trim(), s.id).not.toBe('');
      expect(s.zones.trim(), s.id).not.toBe('');
      expect(s.commonName.trim(), s.id).not.toBe('');
      if (s.legal !== 'libre') expect(s.legalNote?.trim(), s.id).toBeTruthy();
    }
  });

  test('las protegidas están marcadas y no son capturables', () => {
    for (const id of ['anguila', 'sabalo', 'saboga', 'jarabugo', 'calandino', 'colmilleja']) {
      expect(SPECIES_BY_ID[id]?.legal, id).toBe('protegida');
      expect(capturable(SPECIES_BY_ID[id]), id).toBe(false);
    }
  });

  test('las reguladas están marcadas y son capturables', () => {
    for (const id of ['mero', 'atun-rojo', 'trucha-comun', 'besugo']) {
      expect(SPECIES_BY_ID[id]?.legal, id).toBe('regulada');
      expect(capturable(SPECIES_BY_ID[id]), id).toBe(true);
    }
  });

  test('las lisas viven en mar y agua dulce', () => {
    expect(SPECIES_BY_ID['lisas'].habitats).toEqual(expect.arrayContaining(['mar', 'dulce']));
  });
});
