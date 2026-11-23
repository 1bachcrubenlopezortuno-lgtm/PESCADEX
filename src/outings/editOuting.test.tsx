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
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));
vi.mock('../ui/MapPicker', () => ({
  MapPicker: ({ onChange }: { onChange(p: { lat: number; lng: number }): void }) => (
    <button type="button" onClick={() => onChange({ lat: 36.5, lng: -6.3 })}>Marcar en el mapa</button>
  ),
}));

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!, { id: 'u2', displayName: 'Pepe', avatarPath: null }];
});

test('la creadora edita modalidad, sitio, participantes y horas', async () => {
  const start = new Date(2026, 10, 15, 7, 0).toISOString();
  const end = new Date(2026, 10, 15, 13, 0).toISOString();
  backend.outings = [makeOuting({ id: 'o-ed', startedAt: start, endedAt: end, mode: 'spinning', placeName: 'Conil' })];
  renderApp('/jornada/o-ed');
  await userEvent.click(await screen.findByRole('button', { name: 'Editar jornada' }));
  expect(screen.getByLabelText('Nombre del sitio')).toHaveValue('Conil');
  expect(screen.getByLabelText('Desde')).toHaveValue('07:00');
  await userEvent.selectOptions(screen.getByLabelText('Modalidad'), 'barco');
  await userEvent.clear(screen.getByLabelText('Nombre del sitio'));
  await userEvent.type(screen.getByLabelText('Nombre del sitio'), 'Barbate');
  await userEvent.clear(screen.getByLabelText('Hasta'));
  await userEvent.type(screen.getByLabelText('Hasta'), '14:30');
  await userEvent.click(screen.getByLabelText('Pepe'));
  await userEvent.click(screen.getByRole('button', { name: 'Marcar en el mapa' }));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(api.updateOuting).toHaveBeenCalled());
  const [id, patch] = vi.mocked(api.updateOuting).mock.calls[0];
  expect(id).toBe('o-ed');
  expect(patch).toMatchObject({ mode: 'barco', placeName: 'Barbate', companionIds: ['u2'], location: { lat: 36.5, lng: -6.3 } });
  expect(new Date(patch.endedAt!).getHours()).toBe(14);
  expect(new Date(patch.endedAt!).getMinutes()).toBe(30);
});

test('quien no la creó no puede editarla', async () => {
  backend.outings = [makeOuting({ id: 'o-x', ownerId: 'u2', companionIds: ['u1'] })];
  renderApp('/jornada/o-x');
  await screen.findByText(/Participantes/);
  expect(screen.queryByRole('button', { name: 'Editar jornada' })).toBeNull();
});
