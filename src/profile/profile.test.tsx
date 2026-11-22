import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SPECIES } from '../catalog/catalog';
import { asMember, backend, makeCatch, makeOuting, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());

const total = SPECIES.filter((s) => s.legal !== 'protegida').length;

beforeEach(() => {
  resetBackend();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
  backend.catches = [makeCatch({ speciesId: 'dorada', weightG: 1200 })];
  backend.outings = [makeOuting(), makeOuting({ ownerId: 'u2', companionIds: ['u1'] })];
});

test('perfil propio: nivel, XP y Pescadex', async () => {
  renderApp('/perfil');
  expect(await screen.findByText('Nv. 1 · Grumete')).toBeInTheDocument();
  expect(await screen.findByText('85/100 XP')).toBeInTheDocument();
  expect(screen.getByText(`Pescadex: 1/${total} (${Math.round(100 / total)}%)`)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
});

test('perfil de otro no muestra cerrar sesión', async () => {
  renderApp('/perfil/u2');
  expect(await screen.findByRole('heading', { name: 'Pepe' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
});
