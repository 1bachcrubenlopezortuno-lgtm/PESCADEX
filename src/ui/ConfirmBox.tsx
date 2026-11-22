import { useState } from 'react';

/** Confirmación dentro de la página (los diálogos del navegador no funcionan en todas partes). */
export function ConfirmBox({ message, confirmLabel = 'Sí, eliminar', onConfirm, onCancel }: { message: string; confirmLabel?: string; onConfirm(): Promise<void>; onCancel(): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="card confirm" role="alertdialog" aria-label="Confirmar">
      <p>{message}</p>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button
          className="btn danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onConfirm();
            } catch {
              setError('No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.');
              setBusy(false);
            }
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
