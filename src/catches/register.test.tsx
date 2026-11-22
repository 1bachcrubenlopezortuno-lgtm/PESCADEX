import { screen, waitFor } from '@testing-library/react';
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
vi.mock('../data/photo', () => ({ preparePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));
const geo = vi.hoisted(() => ({ value: null as null | { lat: number; lng: number } }));
vi.mock('./useGeolocation', () => ({ useGeolocation: () => ({ request: async () => geo.value }) }));

const photo = () => new File(['img'], 'f.jpg', { type: 'image/jpeg' });

async function pickSpecies(query: string, name: RegExp) {
  await userEvent.type(await screen.findByLabelText('Buscar especie'), query);
  await userEvent.click(screen.getByRole('button', { name }));
}

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  geo.value = null;
  asMember();
  backend.profiles = [backend.profile!];
  backend.outings = [makeOuting({ id: 'o-active' })];
});

test('el buscador no ofrece especies protegidas', async () => {
  renderApp('/registrar');
  const search = await screen.findByLabelText('Buscar especie');
  await userEvent.type(search, 'angu');
  expect(screen.queryByRole('button', { name: /Anguila/ })).toBeNull();
  await userEvent.clear(search);
  await userEvent.type(search, 'dora');
  expect(screen.getByRole('button', { name: /Dorada/ })).toBeInTheDocument();
});

test('sin especie no se puede guardar', async () => {
  renderApp('/registrar');
  expect(await screen.findByRole('button', { name: 'Guardar captura' })).toBeDisabled();
});

test('sin GPS guarda sin ubicación y lo avisa', async () => {
  renderApp('/registrar');
  await pickSpecies('dora', /Dorada/);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
  await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
  expect(vi.mocked(api.createCatch).mock.calls[0][0]).toMatchObject({ location: null, outingId: 'o-active', speciesId: 'dorada' });
  expect(await screen.findByText(/Sin ubicación/)).toBeInTheDocument();
});

test('sin jornada activa crea una de modalidad otra', async () => {
  backend.outings = [];
  renderApp('/registrar');
  await pickSpecies('dora', /Dorada/);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
  await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
  const outing = vi.mocked(api.createOuting).mock.calls[0][0];
  expect(outing).toMatchObject({ mode: 'otra', companionIds: [], shareExact: false });
  expect(vi.mocked(api.createCatch).mock.calls[0][0].outingId).toBe(outing.id);
});

test('doble toque en guardar crea una sola captura', async () => {
  renderApp('/registrar');
  await pickSpecies('dora', /Dorada/);
  const save = screen.getByRole('button', { name: 'Guardar captura' });
  await userEvent.dblClick(save);
  await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
  expect(api.createCatch).toHaveBeenCalledTimes(1);
});

test('primera dorada con foto: nueva especie +75 XP', async () => {
  renderApp('/registrar');
  await userEvent.upload(await screen.findByLabelText('Fotos'), photo());
  await pickSpecies('dora', /Dorada/);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
  expect(await screen.findByText('¡Nueva especie! +75 XP')).toBeInTheDocument();
  expect(api.addCatchPhoto).toHaveBeenCalledTimes(1);
});

test('sin foto se guarda pero no puntúa', async () => {
  renderApp('/registrar');
  await pickSpecies('dora', /Dorada/);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
  expect(await screen.findByText('Guardada sin foto · no puntúa')).toBeInTheDocument();
});

test('si falla la subida de la foto la captura queda guardada sin foto', async () => {
  vi.mocked(api.addCatchPhoto).mockRejectedValueOnce(new Error('network'));
  renderApp('/registrar');
  await userEvent.upload(await screen.findByLabelText('Fotos'), photo());
  await pickSpecies('dora', /Dorada/);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
  expect(await screen.findByText(/no se pudo subir la foto/i)).toBeInTheDocument();
  expect(api.createCatch).toHaveBeenCalledTimes(1);
});
