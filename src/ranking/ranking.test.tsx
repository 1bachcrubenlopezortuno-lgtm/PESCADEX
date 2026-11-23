import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { asMember, backend, makeCatch, makeOuting, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());

beforeEach(() => {
  resetBackend();
  asMember({ id: 'u1', displayName: 'Ana', avatarPath: null });
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }, { id: 'u3', displayName: 'Lola', avatarPath: null }];
  backend.outings = [makeOuting({ id: 'o1', ownerId: 'u1', companionIds: ['u2'] })];
  backend.catches = [
    makeCatch({ userId: 'u2', speciesId: 'dorada', weightG: 2000, caughtAt: '2026-01-01T10:00:00Z' }),
    makeCatch({ userId: 'u2', speciesId: 'sargo', caughtAt: '2026-01-01T11:00:00Z' }),
    makeCatch({ userId: 'u2', speciesId: 'sargo', caughtAt: '2026-01-01T12:00:00Z' }),
    makeCatch({ userId: 'u1', speciesId: 'dorada', weightG: 900 }),
    makeCatch({ userId: 'u1', speciesId: 'urta', photoUrls: [] }),
  ];
});

const rows = () => screen.getAllByTestId('rank-row').map((r) => r.textContent ?? '');

test('la pestaña Ranking está en la barra inferior', async () => {
  renderApp('/');
  expect(await screen.findByRole('link', { name: /Ranking/ })).toHaveAttribute('href', '/ranking');
});

test('ordena por capturas válidas (con foto)', async () => {
  renderApp('/ranking');
  await userEvent.click(await screen.findByRole('button', { name: 'Capturas' }));
  const r = rows();
  expect(r[0]).toMatch(/Pepe.*3/);
  expect(r[1]).toMatch(/Ana.*1/);
  expect(r[2]).toMatch(/Lola.*0/);
});

test('ordena por especies distintas', async () => {
  renderApp('/ranking');
  await userEvent.click(await screen.findByRole('button', { name: 'Especies' }));
  expect(rows()[0]).toMatch(/Pepe.*2/);
});

test('por defecto ordena por nivel y XP', async () => {
  renderApp('/ranking');
  await screen.findAllByTestId('rank-row');
  // Pepe: dorada 75 + sargo 30 + sargo 10 + jornada 5 = 120 XP · Ana: dorada 75 + jornada 5 = 80 XP
  expect(await screen.findByText(/120 XP/)).toBeInTheDocument();
  expect(rows()[0]).toMatch(/Pepe.*120 XP/);
  expect(rows()[1]).toMatch(/Ana.*80 XP/);
});

test('récords: la pieza más grande de cada especie y quién la sacó', async () => {
  renderApp('/ranking');
  await userEvent.click(await screen.findByRole('button', { name: 'Récords' }));
  const dorada = await screen.findByTestId('record-dorada');
  expect(within(dorada).getByText('Dorada')).toBeInTheDocument();
  expect(dorada.textContent).toMatch(/2 kg.*Pepe/);
});
