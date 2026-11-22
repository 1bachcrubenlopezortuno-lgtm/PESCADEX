import { useMemo, useState } from 'react';
import { SPECIES, capturable } from '../catalog/catalog';
import type { Species } from '../catalog/types';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function SpeciesPicker({ value, onChange }: { value: Species | null; onChange(s: Species | null): void }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    return SPECIES.filter((s) => capturable(s) && (norm(s.commonName).includes(n) || norm(s.scientificName).includes(n))).slice(0, 8);
  }, [q]);

  if (value) {
    return (
      <div className="field">
        <span>Especie</span>
        <div className="picked">
          <strong>{value.commonName}</strong> <em className="muted">{value.scientificName}</em>
          {value.legal === 'regulada' && <p className="legal-inline">⚠️ {value.legalNote}</p>}
          <button type="button" className="chip" onClick={() => onChange(null)}>Cambiar</button>
        </div>
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor="species-search">Buscar especie</label>
      <input id="species-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dorada, lubina, barbo…" autoComplete="off" />
      <div className="picker-results">
        {results.map((s) => (
          <button type="button" key={s.id} className="picker-option" onClick={() => onChange(s)}>
            {s.commonName} {s.legal === 'regulada' && '⚠️'}
            <span className="muted"> · {s.scientificName}</span>
          </button>
        ))}
        {q.trim() && results.length === 0 && <p className="muted">Sin resultados.</p>}
      </div>
    </div>
  );
}
