import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Species } from '../catalog/types';
import { addCatchPhoto, createCatch, getOuting, listOutings, toGameCatch } from '../data/api';
import { preparePhoto } from '../data/photo';
import type { LatLng, Outing } from '../data/types';
import { levelInfo } from '../game/levels';
import { catchXpEvents, totalXp, type GameCatch } from '../game/xp';
import { useActiveOuting } from '../outings/useActiveOuting';
import { useMyCatches } from '../pescadex/useMyCatches';
import { SpeciesPicker } from './SpeciesPicker';
import { useGeolocation } from './useGeolocation';

interface Result {
  catchId: string;
  messages: string[];
  warnings: string[];
}

/** 'YYYY-MM-DDTHH:mm' en hora local, para <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toNumber = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

function Thumbs({ files }: { files: File[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);
  return (
    <div className="thumbs">
      {urls.map((u, i) => <img key={u + i} src={u} alt={`Foto ${i + 1}`} />)}
    </div>
  );
}

export function RegisterPage() {
  const { profile } = useAuth();
  const me = profile!.id;
  const { active, start } = useActiveOuting();
  const { catches: myCatches, reload } = useMyCatches(me);
  const { request } = useGeolocation();
  const [params] = useSearchParams();
  const targetId = params.get('jornada');
  const [target, setTarget] = useState<Outing | null>(null);
  const [caughtAtInput, setCaughtAtInput] = useState('');

  useEffect(() => {
    if (!targetId) return;
    getOuting(targetId)
      .then(({ outing }) => {
        setTarget(outing);
        setCaughtAtInput(toLocalInput(outing.startedAt));
      })
      .catch(() => setError('No se encontró la jornada.'));
  }, [targetId]);
  // Captura en una jornada que no es la que está en curso: no se usa el GPS de ahora.
  const pastOuting = target !== null && !(active && active.id === target.id);

  const [catchId, setCatchId] = useState(() => crypto.randomUUID());
  const [files, setFiles] = useState<File[]>([]);
  const [species, setSpecies] = useState<Species | null>(null);
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [bait, setBait] = useState('');
  const [note, setNote] = useState('');
  const [shareExact, setShareExact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const savingRef = useRef(false);
  const locationRef = useRef<Promise<LatLng | null> | null>(null);

  useEffect(() => {
    locationRef.current = targetId ? null : request();
  }, [request, catchId, targetId]);

  function reset() {
    setCatchId(crypto.randomUUID());
    setFiles([]);
    setSpecies(null);
    setWeight('');
    setLength('');
    setBait('');
    setNote('');
    setShareExact(false);
    setResult(null);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!species || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const myOutings = await listOutings({ userId: me });
      if (targetId && !target) return;
      const location = pastOuting ? null : ((await locationRef.current) ?? null);
      const outing = target ?? active ?? (await start({ mode: 'otra', companionIds: [], shareExact: false }, location));
      const newOuting = !myOutings.some((o) => o.id === outing.id);
      const caughtAt = pastOuting && caughtAtInput ? new Date(caughtAtInput).toISOString() : new Date().toISOString();
      const kg = toNumber(weight);
      const weightG = kg ? Math.round(kg * 1000) : undefined;
      const lengthCm = toNumber(length);
      await createCatch({
        id: catchId,
        outingId: outing.id,
        speciesId: species.id,
        caughtAt,
        weightG,
        lengthCm,
        bait,
        note,
        shareExact,
        location,
      });

      let uploaded = 0;
      const warnings: string[] = [];
      try {
        for (const f of files) {
          await addCatchPhoto(catchId, await preparePhoto(f));
          uploaded++;
        }
      } catch {
        warnings.push('La captura se guardó, pero no se pudo subir la foto. Añádela desde el detalle de la captura.');
      }
      if (!location && !pastOuting) warnings.push('📍 Sin ubicación: no se pudo obtener el GPS.');

      const before: GameCatch[] = myCatches.map(toGameCatch);
      const mine: GameCatch = { id: catchId, speciesId: species.id, caughtAt, photoCount: uploaded, weightG: weightG ?? null, lengthCm: lengthCm ?? null };
      const outingCount = myOutings.length;
      const xpBefore = totalXp(before, outingCount);
      const xpAfter = totalXp([...before, mine], outingCount + (newOuting ? 1 : 0));
      const ev = catchXpEvents([...before, mine]).find((x) => x.catchId === catchId);
      const messages: string[] = [];
      if (!ev) messages.push('Guardada sin foto · no puntúa');
      else if (ev.firstOfSpecies) messages.push(`¡Nueva especie! +${ev.xp} XP`);
      else messages.push(ev.record ? `¡Récord personal! +${ev.xp} XP` : `+${ev.xp} XP`);
      const lb = levelInfo(xpBefore);
      const la = levelInfo(xpAfter);
      if (la.level > lb.level) messages.push(`¡Subida de nivel! Nivel ${la.level} · ${la.title}`);

      setResult({ catchId, messages, warnings });
      reload();
    } catch (err) {
      setError(err instanceof Error && err.message === 'protected_species' ? 'Esa especie está protegida y no se puede registrar.' : 'No se pudo guardar la captura. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="register-done">
        {result.messages.map((m) => <p key={m} className="celebrate">{m}</p>)}
        {result.warnings.map((w) => <p key={w} className="tag warn">{w}</p>)}
        <div className="row">
          <Link className="btn" to={`/captura/${result.catchId}`}>Ver captura</Link>
          <button className="btn secondary" onClick={reset}>Registrar otra</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save}>
      <h1>Registrar captura</h1>
      <p className="muted">
        {target
          ? `Se añadirá a la jornada del ${new Date(target.startedAt).toLocaleDateString('es-ES')}.`
          : active
            ? 'Se añadirá a tu jornada en curso.'
            : 'Se creará una jornada nueva para esta captura.'}
      </p>
      {pastOuting && (
        <label className="field">
          Día y hora de la captura
          <input type="datetime-local" value={caughtAtInput} onChange={(e) => setCaughtAtInput(e.target.value)} />
        </label>
      )}

      <label className="field">
        Fotos
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
      {files.length === 0 && <p className="muted small">Sin foto la captura se guarda, pero no da XP ni desbloquea la especie.</p>}
      {files.length > 0 && (
        <Thumbs files={files} />
      )}

      <SpeciesPicker value={species} onChange={setSpecies} />

      <div className="row two">
        <label className="field">
          Peso (kg)
          <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="1,2" />
        </label>
        <label className="field">
          Medida (cm)
          <input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} placeholder="35" />
        </label>
      </div>
      <label className="field">
        Cebo / señuelo
        <input value={bait} onChange={(e) => setBait(e.target.value)} placeholder="Gusana, vinilo, cangrejo…" />
      </label>
      <label className="field">
        Nota
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={shareExact} onChange={(e) => setShareExact(e.target.checked)} />
        Compartir ubicación exacta con el grupo
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn block" disabled={!species || saving}>{saving ? 'Guardando…' : 'Guardar captura'}</button>
    </form>
  );
}
