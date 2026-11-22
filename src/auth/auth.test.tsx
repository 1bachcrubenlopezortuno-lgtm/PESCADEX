import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { authMock, backend, asMember, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
import * as api from '../data/api';
const joinGroup = vi.mocked(api.joinGroup);

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
});

test('sin sesión manda a /login, pide email y luego el código', async () => {
  renderApp('/');
  const email = await screen.findByLabelText('Email');
  await userEvent.type(email, 'ana@x.es');
  await userEvent.click(screen.getByRole('button', { name: 'Enviarme un código' }));
  expect(authMock.signInWithOtp).toHaveBeenCalledWith({ email: 'ana@x.es', options: { shouldCreateUser: true } });
  const code = await screen.findByLabelText('Código de 6 dígitos');
  await userEvent.type(code, '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(authMock.verifyOtp).toHaveBeenCalledWith({ email: 'ana@x.es', token: '123456', type: 'email' });
});

test('con sesión pero sin perfil manda a /unirse', async () => {
  backend.session = { user: { id: 'u9', email: 'n@x.es' } };
  renderApp('/');
  expect(await screen.findByLabelText('Código de invitación')).toBeInTheDocument();
});

test('código de invitación incorrecto muestra error', async () => {
  backend.session = { user: { id: 'u9', email: 'n@x.es' } };
  joinGroup.mockRejectedValue(new Error('invalid_invite'));
  renderApp('/unirse');
  await userEvent.type(await screen.findByLabelText('Tu nombre'), 'Nico');
  await userEvent.type(screen.getByLabelText('Código de invitación'), 'mal');
  await userEvent.click(screen.getByRole('button', { name: 'Unirme' }));
  expect(await screen.findByText('Código de invitación incorrecto')).toBeInTheDocument();
});

test('un miembro en /login va a la Pescadex', async () => {
  asMember();
  renderApp('/login');
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Pescadex' })).toBeInTheDocument());
});
