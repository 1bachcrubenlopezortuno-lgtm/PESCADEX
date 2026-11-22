import { useState, type FormEvent } from 'react';
import { joinGroup } from '../data/api';
import { useAuth } from './AuthProvider';

export function JoinPage() {
  const { refresh, signOut } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await joinGroup(code, name);
      await refresh();
    } catch (err) {
      setError(err instanceof Error && err.message === 'invalid_invite' ? 'Código de invitación incorrecto' : 'No se pudo completar. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content auth-page">
      <div className="auth-logo" aria-hidden="true">🐟</div>
      <h1>Únete al grupo</h1>
      <p className="muted">Pide el código de invitación a quien te pasó la app.</p>
      <form onSubmit={submit}>
        <label className="field">
          Tu nombre
          <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Código de invitación
          <input required value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button className="btn block" disabled={busy || !name.trim() || !code.trim()}>Unirme</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button className="btn secondary block" style={{ marginTop: 16 }} onClick={() => void signOut()}>Salir</button>
    </div>
  );
}
