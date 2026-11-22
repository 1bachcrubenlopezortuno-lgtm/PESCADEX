import { useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../data/supabase';
import { useAuth } from './AuthProvider';

function message(err: string, mode: 'login' | 'signup'): string {
  if (/invalid login credentials/i.test(err)) return 'Email o contraseña incorrectos.';
  if (/already registered|already exists/i.test(err)) return 'Ese email ya tiene cuenta. Entra con tu contraseña.';
  if (/password/i.test(err) && /least|short|weak/i.test(err)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(err)) return 'Falta desactivar "Confirm email" en Supabase (ver README).';
  return mode === 'login' ? 'No se pudo entrar. Revisa la conexión.' : 'No se pudo crear la cuenta. Revisa la conexión.';
}

export function LoginPage() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const creds = { email: email.trim(), password };
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword(creds);
      setBusy(false);
      if (error) return setError(message(error.message, mode));
    } else {
      const { data, error } = await supabase.auth.signUp(creds);
      setBusy(false);
      if (error) return setError(message(error.message, mode));
      if (!data.session) return setError('Falta desactivar "Confirm email" en Supabase (ver README).');
    }
    await refresh();
  }

  const isLogin = mode === 'login';
  return (
    <div className="content auth-page">
      <div className="auth-logo" aria-hidden="true">🎣</div>
      <h1>Pescadex</h1>
      <p className="muted">La Pokédex de pesca del grupo.</p>
      {!supabaseConfigured && <p className="error">Falta configurar Supabase (ver README).</p>}
      <form onSubmit={submit}>
        <label className="field">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn block" disabled={busy || !email || password.length < 6}>{isLogin ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button
        type="button"
        className="btn secondary block"
        style={{ marginTop: 12 }}
        onClick={() => {
          setMode(isLogin ? 'signup' : 'login');
          setError(null);
        }}
      >
        {isLogin ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Entrar'}
      </button>
      {isLogin && <p className="muted small">¿Olvidaste la contraseña? Pide al administrador del grupo que te la cambie.</p>}
    </div>
  );
}
