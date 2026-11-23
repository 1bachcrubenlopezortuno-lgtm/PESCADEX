import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../data/api';
import { preparePhoto } from '../data/photo';
import { asMember, backend, makeCatch, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
vi.mock('../data/photo', () => ({ preparePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
});

test('captura propia sin foto permite añadirla', async () => {
  backend.catches = [makeCatch({ id: 'c-own', photoUrls: [] })];
  renderApp('/captura/c-own');
  expect(await screen.findByText('Sin foto · no puntúa')).toBeInTheDocument();
  const input = screen.getByLabelText('Añadir foto');
  await userEvent.upload(input, new File(['img'], 'f.jpg', { type: 'image/jpeg' }));
  expect(preparePhoto).toHaveBeenCalled();
  expect(api.addCatchPhoto).toHaveBeenCalledWith('c-own', expect.any(Blob));
});

test('captura ajena sin foto no tiene botón de añadir', async () => {
  backend.catches = [makeCatch({ id: 'c-other', userId: 'u2', photoUrls: [] })];
  renderApp('/captura/c-other');
  expect(await screen.findByText('Sin foto · no puntúa')).toBeInTheDocument();
  expect(screen.queryByLabelText('Añadir foto')).toBeNull();
});

test('si falla añadir la foto, muestra el motivo', async () => {
  backend.catches = [makeCatch({ id: 'c-err', photoUrls: [] })];
  vi.mocked(api.addCatchPhoto).mockRejectedValueOnce(new Error('new row violates row-level security policy'));
  renderApp('/captura/c-err');
  await userEvent.upload(await screen.findByLabelText('Añadir foto'), new File(['img'], 'f.jpg', { type: 'image/jpeg' }));
  expect(await screen.findByText(/row-level security/)).toBeInTheDocument();
});
