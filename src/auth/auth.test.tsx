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

test('sin sesión manda a /login y entra con email y contraseña', async () => {
  renderApp('/');
  await userEvent.type(await screen.findByLabelText('Email'), 'ana@x.es');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta1');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@x.es', password: 'secreta1' });
});

test('credenciales incorrectas muestran error', async () => {
  authMock.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } });
  renderApp('/login');
  await userEvent.type(await screen.findByLabelText('Email'), 'ana@x.es');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'mala123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument();
});

test('crear cuenta llama a signUp', async () => {
  renderApp('/login');
  await userEvent.click(await screen.findByRole('button', { name: '¿No tienes cuenta? Crear una' }));
  await userEvent.type(screen.getByLabelText('Email'), 'nico@x.es');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta1');
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(authMock.signUp).toHaveBeenCalledWith({ email: 'nico@x.es', password: 'secreta1' });
});

test('crear cuenta con un email ya registrado avisa', async () => {
  authMock.signUp.mockResolvedValueOnce({ data: { session: null }, error: { message: 'User already registered' } });
  renderApp('/login');
  await userEvent.click(await screen.findByRole('button', { name: '¿No tienes cuenta? Crear una' }));
  await userEvent.type(screen.getByLabelText('Email'), 'ana@x.es');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta1');
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByText('Ese email ya tiene cuenta. Entra con tu contraseña.')).toBeInTheDocument();
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
