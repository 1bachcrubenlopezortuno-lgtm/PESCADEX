import { useState, type FormEvent } from 'react';
import { supabase, supabaseConfigured } from '../data/supabase';
import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError('No se pudo enviar el código. Revisa el email e inténtalo de nuevo.');
    else setStep('code');
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError('Código incorrecto o caducado.');
    else await refresh();
  }

  return (
    <div className="content auth-page">
      <div className="auth-logo" aria-hidden="true">🎣</div>
      <h1>Pescadex</h1>
      <p className="muted">La Pokédex de pesca del grupo.</p>
      {!supabaseConfigured && <p className="error">Falta configurar Supabase (ver README).</p>}
      {step === 'email' ? (
        <form onSubmit={sendCode}>
          <label className="field">
            Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="btn block" disabled={busy || !email}>Enviarme un código</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p>Te hemos enviado un código a <strong>{email}</strong>.</p>
          <label className="field">
            Código de 6 dígitos
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="btn block" disabled={busy || code.length < 6}>Entrar</button>
          <button type="button" className="btn secondary block" style={{ marginTop: 8 }} onClick={() => setStep('email')}>
            Cambiar email
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
