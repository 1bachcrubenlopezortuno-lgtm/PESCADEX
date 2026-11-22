import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { asMember } from './test/mockBackend';
import { renderApp } from './test/renderApp';

vi.mock('./data/supabase', async () => {
  const { authMock } = await import('./test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('./data/api', async () => (await import('./test/mockBackend')).apiMock());

test('muestra la barra inferior con las cuatro secciones', async () => {
  asMember();
  renderApp('/');
  for (const label of ['Pescadex', 'Cuaderno', 'Registrar', 'Perfil']) {
    expect(await screen.findByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
  }
});
