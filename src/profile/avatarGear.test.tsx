import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../data/api';
import { asMember, backend, makeCatch, makeOuting, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
vi.mock('../data/photo', () => ({ preparePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
  backend.outings = [makeOuting({ id: 'o-active' })];
});

describe('foto de perfil', () => {
  test('eliges una de tus fotos subidas', async () => {
    backend.catches = [
      makeCatch({ speciesId: 'dorada', photoUrls: ['https://foto/dorada.jpg'], photoPaths: ['u1/c-d/1.jpg'] }),
      makeCatch({ speciesId: 'sargo', userId: 'u2', photoUrls: ['https://foto/ajena.jpg'], photoPaths: ['u2/c-s/1.jpg'] }),
    ];
    renderApp('/perfil');
    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar foto' }));
    const picker = screen.getByRole('group', { name: 'Tus fotos' });
    expect(within(picker).queryByAltText(/Sargo/)).toBeNull();
    await userEvent.click(within(picker).getByRole('button', { name: 'Usar foto de Dorada' }));
    expect(api.updateMyAvatar).toHaveBeenCalledWith('u1/c-d/1.jpg');
  });

  test('se muestra la foto en el perfil', async () => {
    backend.profile = { id: 'u1', displayName: 'Ana', avatarPath: 'u1/c/1.jpg', avatarUrl: 'https://foto/avatar.jpg' };
    backend.profiles = [backend.profile];
    renderApp('/perfil');
    expect(await screen.findByAltText('Foto de Ana')).toHaveAttribute('src', 'https://foto/avatar.jpg');
  });

  test('en el perfil de otro no se puede cambiar', async () => {
    renderApp('/perfil/u2');
    await screen.findByRole('heading', { name: 'Pepe' });
    expect(screen.queryByRole('button', { name: 'Cambiar foto' })).toBeNull();
  });
});

describe('equipo', () => {
  test('se apunta el equipo al registrar, con sugerencias del que ya usaste', async () => {
    backend.catches = [makeCatch({ gear: 'Caña surf 4,20 + carrete 6000' })];
    renderApp('/registrar');
    const gear = await screen.findByLabelText('Equipo');
    await waitFor(() => expect([...document.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))).toContain('Caña surf 4,20 + carrete 6000'));
    await userEvent.type(screen.getByLabelText('Buscar especie'), 'dora');
    await userEvent.click(screen.getByRole('button', { name: /Dorada/ }));
    await userEvent.type(gear, 'Spinning 2,70 + 3000');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
    await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
    expect(vi.mocked(api.createCatch).mock.calls[0][0]).toMatchObject({ gear: 'Spinning 2,70 + 3000' });
  });

  test('se ve en el detalle de la captura', async () => {
    backend.catches = [makeCatch({ id: 'c-g', gear: 'Caña surf 4,20' })];
    renderApp('/captura/c-g');
    expect(await screen.findByText('Caña surf 4,20')).toBeInTheDocument();
    expect(screen.getByText(/Equipo:/)).toBeInTheDocument();
  });

  test('también en los peces de una jornada pasada', async () => {
    renderApp('/cuaderno');
    await userEvent.click(await screen.findByRole('button', { name: 'Apuntar jornada pasada' }));
    await userEvent.type(screen.getByLabelText('Día'), '2026-11-15');
    await userEvent.type(screen.getByLabelText('Desde'), '07:00');
    await userEvent.type(screen.getByLabelText('Hasta'), '13:00');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir pez' }));
    const row = screen.getByTestId('past-catch-0');
    await userEvent.type(within(row).getByLabelText('Buscar especie'), 'dora');
    await userEvent.click(within(row).getByRole('button', { name: /Dorada/ }));
    await userEvent.type(within(row).getByLabelText('Equipo'), 'Caña de barco');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));
    await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
    expect(vi.mocked(api.createCatch).mock.calls[0][0]).toMatchObject({ gear: 'Caña de barco' });
  });
});
