import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SPECIES_BY_ID } from '../catalog/catalog';
import { listCatches, listOutings, listProfiles } from '../data/api';
import type { Catch, Outing, Profile } from '../data/types';
import { Avatar } from '../ui/Avatar';
import { formatLength, formatWeight } from '../ui/format';
import { speciesRecords, standings, type Standing } from './standings';

type Board = 'nivel' | 'capturas' | 'especies' | 'records';

const BOARDS: { id: Board; label: string }[] = [
  { id: 'nivel', label: 'Nivel' },
  { id: 'capturas', label: 'Capturas' },
  { id: 'especies', label: 'Especies' },
  { id: 'records', label: 'Récords' },
];

const VALUE: Record<Exclude<Board, 'records'>, (s: Standing) => number> = {
  nivel: (s) => s.xp,
  capturas: (s) => s.validCatches,
  especies: (s) => s.species,
};

function valueLabel(board: Exclude<Board, 'records'>, s: Standing): string {
  if (board === 'nivel') return `Nv. ${s.level.level} · ${s.xp} XP`;
  if (board === 'capturas') return `${s.validCatches} ${s.validCatches === 1 ? 'captura' : 'capturas'}`;
  return `${s.species} ${s.species === 1 ? 'especie' : 'especies'}`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function RankingPage() {
  const { profile } = useAuth();
  const [board, setBoard] = useState<Board>('nivel');
  const [data, setData] = useState<{ profiles: Profile[]; catches: Catch[]; outings: Outing[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProfiles(), listCatches({}), listOutings({})])
      .then(([profiles, catches, outings]) => setData({ profiles, catches, outings }))
      .catch(() => setError('No se pudo cargar el ranking.'));
  }, []);

  const table = useMemo(() => (data ? standings(data.profiles, data.catches, data.outings) : []), [data]);
  const records = useMemo(() => (data ? speciesRecords(data.catches) : []), [data]);
  const name = (id: string) => data?.profiles.find((p) => p.id === id)?.displayName ?? '¿?';

  return (
    <div>
      <h1>Ranking</h1>
      <div className="tabs" role="group" aria-label="Clasificación">
        {BOARDS.map((b) => (
          <button key={b.id} className={`chip${board === b.id ? ' on' : ''}`} aria-pressed={board === b.id} onClick={() => setBoard(b.id)}>
            {b.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Cargando…</p>}

      {data && board !== 'records' && (
        <ol className="ranking">
          {[...table]
            .sort((a, b) => VALUE[board](b) - VALUE[board](a) || a.profile.displayName.localeCompare(b.profile.displayName))
            .map((s, i) => (
              <li key={s.profile.id} data-testid="rank-row" className={`rank-row${s.profile.id === profile!.id ? ' me' : ''}`}>
                <span className="rank-pos">{MEDAL[i] ?? i + 1}</span>
                <Avatar profile={s.profile} size={34} />
                <Link to={`/perfil/${s.profile.id}`} className="rank-name">{s.profile.displayName}</Link>
                <span className="rank-value">{valueLabel(board, s)}</span>
              </li>
            ))}
        </ol>
      )}

      {data && board === 'records' && (
        records.length ? (
          <ul className="list">
            {records.map((r) => (
              <li key={r.speciesId} data-testid={`record-${r.speciesId}`}>
                <Link className="card outing-row" to={`/captura/${r.catchId}`}>
                  <span><strong>{SPECIES_BY_ID[r.speciesId]?.commonName ?? r.speciesId}</strong></span>
                  <span className="muted">
                    {[r.weightG && formatWeight(r.weightG), r.lengthCm && formatLength(r.lengthCm)].filter(Boolean).join(' · ')} · {name(r.userId)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aún no hay récords. Apunta el peso o la medida de tus capturas.</p>
        )
      )}
    </div>
  );
}
