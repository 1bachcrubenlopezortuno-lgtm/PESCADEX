import { screen, waitFor } from '@testing-library/react';
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
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
});

describe('eliminar jornada', () => {
  test('la creadora la borra tras confirmar', async () => {
    backend.outings = [makeOuting({ id: 'o-del', endedAt: new Date().toISOString() })];
    backend.catches = [makeCatch({ outingId: 'o-del' }), makeCatch({ outingId: 'o-del' })];
    renderApp('/jornada/o-del');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar jornada' }));
    expect(screen.getByText('Se borrará la jornada y sus 2 capturas. No se puede deshacer.')).toBeInTheDocument();
    expect(api.deleteOuting).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(api.deleteOuting).toHaveBeenCalledWith('o-del');
    expect(await screen.findByRole('heading', { name: 'Cuaderno' })).toBeInTheDocument();
  });

  test('quien no la creó no ve el botón', async () => {
    backend.outings = [makeOuting({ id: 'o-other', ownerId: 'u2', companionIds: ['u1'] })];
    renderApp('/jornada/o-other');
    await screen.findByText(/Participantes/);
    expect(screen.queryByRole('button', { name: 'Eliminar jornada' })).toBeNull();
  });

  test('si hay capturas de otros, avisa y no la borra', async () => {
    backend.outings = [makeOuting({ id: 'o-mix', companionIds: ['u2'] })];
    backend.catches = [makeCatch({ outingId: 'o-mix', userId: 'u2' })];
    renderApp('/jornada/o-mix');
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar jornada' }));
    expect(screen.getByText('Pepe tiene capturas en esta jornada. Tiene que eliminarlas antes de que puedas borrarla.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sí, eliminar' })).toBeNull();
  });
});

test('eliminar una captura propia', async () => {
  backend.catches = [makeCatch({ id: 'c-del' })];
  renderApp('/captura/c-del');
  await userEvent.click(await screen.findByRole('button', { name: 'Eliminar captura' }));
  await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
  expect(api.deleteCatch).toHaveBeenCalledWith('c-del');
});

describe('apuntar jornada pasada', () => {
  test('guarda fecha, horas, modalidad y compañeros', async () => {
    renderApp('/cuaderno');
    await userEvent.click(await screen.findByRole('button', { name: 'Apuntar jornada pasada' }));
    await userEvent.type(screen.getByLabelText('Día'), '2026-11-15');
    await userEvent.type(screen.getByLabelText('Desde'), '07:00');
    await userEvent.type(screen.getByLabelText('Hasta'), '13:00');
    await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'surfcasting');
    await userEvent.click(screen.getByLabelText('Pepe'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));
    await waitFor(() => expect(api.createOuting).toHaveBeenCalled());
    const o = vi.mocked(api.createOuting).mock.calls[0][0];
    expect(o).toMatchObject({ mode: 'surfcasting', companionIds: ['u2'], location: null });
    expect(new Date(o.startedAt).getHours()).toBe(7);
    expect(new Date(o.endedAt!).getHours()).toBe(13);
    expect(new Date(o.startedAt).getDate()).toBe(15);
  });

  test('la hora de fin debe ser posterior al inicio', async () => {
    renderApp('/cuaderno');
    await userEvent.click(await screen.findByRole('button', { name: 'Apuntar jornada pasada' }));
    await userEvent.type(screen.getByLabelText('Día'), '2026-11-15');
    await userEvent.type(screen.getByLabelText('Desde'), '13:00');
    await userEvent.type(screen.getByLabelText('Hasta'), '07:00');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));
    expect(screen.getByText('La hora de fin tiene que ser posterior a la de inicio.')).toBeInTheDocument();
    expect(api.createOuting).not.toHaveBeenCalled();
  });

  test('añadir captura a una jornada pasada usa esa jornada y su fecha, sin GPS', async () => {
    const start = new Date(2026, 10, 15, 7, 0).toISOString();
    backend.outings = [makeOuting({ id: 'o-past', startedAt: start, endedAt: new Date(2026, 10, 15, 13, 0).toISOString() })];
    renderApp('/jornada/o-past');
    await userEvent.click(await screen.findByRole('link', { name: 'Añadir captura' }));
    await userEvent.type(await screen.findByLabelText('Buscar especie'), 'dora');
    await userEvent.click(screen.getByRole('button', { name: /Dorada/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar captura' }));
    await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
    const c = vi.mocked(api.createCatch).mock.calls[0][0];
    expect(c).toMatchObject({ outingId: 'o-past', location: null });
    expect(new Date(c.caughtAt).getDate()).toBe(15);
    expect(api.createOuting).not.toHaveBeenCalled();
  });
});
