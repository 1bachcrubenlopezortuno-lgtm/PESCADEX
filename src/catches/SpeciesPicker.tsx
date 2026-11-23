import { useId, useMemo, useState, type FormEvent } from 'react';
import { capturable, findByName, normalizeName } from '../catalog/catalog';
import { useCatalog } from '../catalog/CatalogProvider';
import { RARITIES, RARITY_LABEL, type Habitat, type Rarity, type Species } from '../catalog/types';
import { createCustomSpecies } from '../data/api';

const capitalize = (s: string) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1);

function CreateSpeciesForm({ initialName, onCreated, onCancel }: { initialName: string; onCreated(s: Species): void; onCancel(): void }) {
  const { addCustom } = useCatalog();
  const ids = useId();
  const [name, setName] = useState(capitalize(initialName));
  const [scientific, setScientific] = useState('');
  const [medio, setMedio] = useState<'mar' | 'dulce' | 'ambos'>('mar');
  const [rarity, setRarity] = useState<Rarity>('poco_comun');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const clean = capitalize(name);
    if (!clean) return setError('Escribe el nombre del pez.');
    const existing = findByName(clean);
    if (existing) return setError(`«${existing.commonName}» ya está en la Pescadex.`);
    setBusy(true);
    setError(null);
    try {
      const habitats: Habitat[] = medio === 'ambos' ? ['mar', 'dulce'] : [medio];
      const s = await createCustomSpecies({ commonName: clean, scientificName: scientific, habitats, rarity });
      addCustom(s);
      onCreated(s);
    } catch {
      setError('No se pudo crear la especie. Revisa la conexión.');
      setBusy(false);
    }
  }

  // Sin <form> propio: este bloque puede ir dentro de otro formulario.
  return (
    <div className="create-species">
      <strong>Nueva especie para la Pescadex</strong>
      <label className="field" htmlFor={`${ids}-n`}>
        Nombre
        <input id={`${ids}-n`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field" htmlFor={`${ids}-s`}>
        Nombre científico (opcional)
        <input id={`${ids}-s`} value={scientific} maxLength={80} onChange={(e) => setScientific(e.target.value)} placeholder="Parablennius gattorugine" />
      </label>
      <div className="row two">
        <label className="field" htmlFor={`${ids}-m`}>
          Medio
          <select id={`${ids}-m`} value={medio} onChange={(e) => setMedio(e.target.value as typeof medio)}>
            <option value="mar">Mar</option>
            <option value="dulce">Agua dulce</option>
            <option value="ambos">Ambos</option>
          </select>
        </label>
        <label className="field" htmlFor={`${ids}-r`}>
          Rareza
          <select id={`${ids}-r`} value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
            {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={() => void submit()}>Crear especie</button>
        <button type="button" className="btn secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function SpeciesPicker({ value, onChange }: { value: Species | null; onChange(s: Species | null): void }) {
  const { species, version } = useCatalog();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const inputId = useId();
  const results = useMemo(() => {
    const n = normalizeName(q);
    if (!n) return [];
    return species.filter((s) => capturable(s) && (normalizeName(s.commonName).includes(n) || normalizeName(s.scientificName).includes(n))).slice(0, 8);
  }, [q, species, version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (value) {
    return (
      <div className="field">
        <span>Especie</span>
        <div className="picked">
          <strong>{value.commonName}</strong> {value.scientificName && <em className="muted">{value.scientificName}</em>}
          {value.legal === 'regulada' && <p className="legal-inline">⚠️ {value.legalNote}</p>}
          <button type="button" className="chip" onClick={() => onChange(null)}>Cambiar</button>
        </div>
      </div>
    );
  }
  if (creating) {
    return (
      <CreateSpeciesForm
        initialName={q}
        onCancel={() => setCreating(false)}
        onCreated={(s) => {
          setCreating(false);
          setQ('');
          onChange(s);
        }}
      />
    );
  }
  return (
    <div className="field">
      <label htmlFor={inputId}>Buscar especie</label>
      <input id={inputId} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dorada, lubina, barbo…" autoComplete="off" />
      <div className="picker-results">
        {results.map((s) => (
          <button type="button" key={s.id} className="picker-option" onClick={() => onChange(s)}>
            {s.commonName} {s.legal === 'regulada' && '⚠️'}
            {s.scientificName && <span className="muted"> · {s.scientificName}</span>}
          </button>
        ))}
        {q.trim() && results.length === 0 && (
          <>
            <p className="muted">No está en la Pescadex.</p>
            <button type="button" className="btn secondary" onClick={() => setCreating(true)}>{`Crear «${q.trim()}»`}</button>
          </>
        )}
      </div>
    </div>
  );
}
