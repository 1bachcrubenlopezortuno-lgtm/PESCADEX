import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../data/api';
import { asMember, backend, makeOuting, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));

const pepe = { id: 'u2', displayName: 'Pepe', avatarPath: null };

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, pepe];
});

test('empezar jornada de spinning con un compañero', async () => {
  renderApp('/cuaderno');
  await userEvent.click(await screen.findByRole('button', { name: 'Empezar jornada' }));
  await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'spinning');
  await userEvent.click(screen.getByLabelText('Pepe'));
  await userEvent.click(screen.getByRole('button', { name: 'Empezar' }));
  expect(api.createOuting).toHaveBeenCalledWith(
    expect.objectContaining({ mode: 'spinning', companionIds: ['u2'], id: expect.stringMatching(/^[0-9a-f-]{36}$/) }),
  );
  expect(await screen.findByText('Jornada en curso')).toBeInTheDocument();
});

test('una jornada sin capturas aparece en blanco', async () => {
  backend.outings = [makeOuting({ endedAt: new Date().toISOString() })];
  renderApp('/cuaderno');
  expect(await screen.findByText('En blanco')).toBeInTheDocument();
});

test('una jornada de hace 20 h sin terminar ya no está en curso', async () => {
  backend.outings = [makeOuting({ startedAt: new Date(Date.now() - 20 * 3600_000).toISOString() })];
  renderApp('/cuaderno');
  expect(await screen.findByRole('button', { name: 'Empezar jornada' })).toBeInTheDocument();
  expect(screen.queryByText('Jornada en curso')).toBeNull();
});

test('un compañero etiquetado ve la jornada como en curso', async () => {
  backend.outings = [makeOuting({ ownerId: 'u2', companionIds: ['u1'] })];
  renderApp('/cuaderno');
  expect(await screen.findByText('Jornada en curso')).toBeInTheDocument();
});
