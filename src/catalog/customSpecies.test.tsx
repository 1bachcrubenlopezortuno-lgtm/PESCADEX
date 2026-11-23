import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../data/api';
import { asMember, backend, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';
import type { Species } from './types';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
vi.mock('../data/photo', () => ({ preparePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));

const pezLuna: Species = {
  id: 'custom-pez-luna-ab12', commonName: 'Pez luna', scientificName: 'Mola mola', habitats: ['mar'], group: 'Añadidas por el grupo',
  rarity: 'legendaria', legal: 'libre', description: 'Especie añadida por el grupo.', bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], zones: '—', createdBy: 'u2',
};

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
});

test('el blenio está en la Pescadex', async () => {
  renderApp('/registrar');
  await userEvent.type(await screen.findByLabelText('Buscar especie'), 'bleni');
  expect(screen.getByRole('button', { name: /Blenio/ })).toBeInTheDocument();
});

test('las especies añadidas por el grupo salen en la Pescadex y en el buscador', async () => {
  backend.customSpecies = [pezLuna];
  renderApp('/');
  const card = await screen.findByTestId('species-custom-pez-luna-ab12');
  expect(within(card).getByText('Pez luna')).toBeInTheDocument();
});

test('si no existe, se puede crear desde el buscador y queda elegida', async () => {
  renderApp('/registrar');
  await userEvent.type(await screen.findByLabelText('Buscar especie'), 'pez ballesta gris');
  await userEvent.click(screen.getByRole('button', { name: 'Crear «pez ballesta gris»' }));
  expect(screen.getByLabelText('Nombre')).toHaveValue('Pez ballesta gris');
  await userEvent.selectOptions(screen.getByLabelText('Rareza'), 'rara');
  await userEvent.click(screen.getByRole('button', { name: 'Crear especie' }));
  await waitFor(() => expect(api.createCustomSpecies).toHaveBeenCalledWith(expect.objectContaining({ commonName: 'Pez ballesta gris', rarity: 'rara', habitats: ['mar'] })));
  expect(await screen.findByText('Pez ballesta gris')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar captura' })).toBeEnabled();
});

test('no deja crear una especie que ya existe con ese nombre', async () => {
  renderApp('/registrar');
  await userEvent.type(await screen.findByLabelText('Buscar especie'), 'zzz');
  await userEvent.click(screen.getByRole('button', { name: 'Crear «zzz»' }));
  await userEvent.clear(screen.getByLabelText('Nombre'));
  await userEvent.type(screen.getByLabelText('Nombre'), 'dorada');
  await userEvent.click(screen.getByRole('button', { name: 'Crear especie' }));
  expect(screen.getByText('«Dorada» ya está en la Pescadex.')).toBeInTheDocument();
  expect(api.createCustomSpecies).not.toHaveBeenCalled();
});
