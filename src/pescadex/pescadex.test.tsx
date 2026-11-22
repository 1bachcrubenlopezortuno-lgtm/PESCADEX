import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SPECIES } from '../catalog/catalog';
import { asMember, backend, makeCatch, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());

const total = SPECIES.filter((s) => s.legal !== 'protegida').length;
const card = (id: string) => screen.getByTestId(`species-${id}`);

beforeEach(() => {
  resetBackend();
  asMember();
  backend.profiles = [backend.profile!];
});

test('sin capturas: siluetas, protegidas con candado y 0%', async () => {
  renderApp('/');
  expect(await screen.findByText(`0/${total} (0%)`)).toBeInTheDocument();
  expect(within(card('dorada')).getByText('???')).toBeInTheDocument();
  expect(within(card('dorada')).queryByText('Dorada')).toBeNull();
  expect(within(card('anguila')).getByText('Anguila')).toBeInTheDocument();
  expect(within(card('anguila')).getByText('🔒')).toBeInTheDocument();
});

test('una dorada con foto la desbloquea', async () => {
  backend.catches = [makeCatch({ speciesId: 'dorada' })];
  renderApp('/');
  expect(await screen.findByText(new RegExp(`^1/${total}`))).toBeInTheDocument();
  expect(within(card('dorada')).getByText('Dorada')).toBeInTheDocument();
});

test('una dorada sin foto no la desbloquea', async () => {
  backend.catches = [makeCatch({ speciesId: 'dorada', photoUrls: [] })];
  renderApp('/');
  expect(await screen.findByText(`0/${total} (0%)`)).toBeInTheDocument();
  expect(within(card('dorada')).getByText('???')).toBeInTheDocument();
});

test('filtro de agua dulce', async () => {
  renderApp('/');
  await screen.findByText(`0/${total} (0%)`);
  await userEvent.click(screen.getByRole('button', { name: 'Agua dulce' }));
  expect(screen.queryByTestId('species-dorada')).toBeNull();
  expect(screen.getByTestId('species-barbo-gitano')).toBeInTheDocument();
});

test('ficha de especie regulada muestra aviso y normativa', async () => {
  backend.catches = [makeCatch({ speciesId: 'mero' })];
  renderApp('/especie/mero');
  expect(await screen.findByRole('heading', { name: /Mero/ })).toBeInTheDocument();
  expect(screen.getByText(/⚠️/)).toBeInTheDocument();
  expect(screen.getByText(/Muy regulado/)).toBeInTheDocument();
});

test('ficha sin capturar oculta el nombre', async () => {
  renderApp('/especie/urta');
  expect(await screen.findByRole('heading', { name: '???' })).toBeInTheDocument();
});
