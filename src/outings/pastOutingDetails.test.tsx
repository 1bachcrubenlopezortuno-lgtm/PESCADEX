import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as api from '../data/api';
import { asMember, backend, resetBackend } from '../test/mockBackend';
import { renderApp } from '../test/renderApp';

vi.mock('../data/supabase', async () => {
  const { authMock } = await import('../test/mockBackend');
  return { supabase: { auth: authMock }, supabaseConfigured: true };
});
vi.mock('../data/api', async () => (await import('../test/mockBackend')).apiMock());
vi.mock('../data/photo', () => ({ preparePhoto: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }));
vi.mock('../catches/useGeolocation', () => ({ useGeolocation: () => ({ request: async () => null }) }));
// El mapa real (Leaflet) no funciona en jsdom: lo sustituimos por un botón que elige un punto.
vi.mock('../ui/MapPicker', () => ({
  MapPicker: ({ onChange }: { onChange(p: { lat: number; lng: number }): void }) => (
    <button type="button" onClick={() => onChange({ lat: 36.27, lng: -6.09 })}>Marcar Conil en el mapa</button>
  ),
}));

beforeEach(() => {
  resetBackend();
  vi.clearAllMocks();
  asMember();
  backend.profiles = [backend.profile!];
});

async function fillBasics() {
  await userEvent.click(await screen.findByRole('button', { name: 'Apuntar jornada pasada' }));
  await userEvent.type(screen.getByLabelText('Día'), '2026-11-15');
  await userEvent.type(screen.getByLabelText('Desde'), '07:00');
  await userEvent.type(screen.getByLabelText('Hasta'), '13:00');
}

test('guarda el sitio elegido en el mapa y su nombre', async () => {
  renderApp('/cuaderno');
  await fillBasics();
  await userEvent.click(screen.getByRole('button', { name: 'Marcar Conil en el mapa' }));
  await userEvent.type(screen.getByLabelText('Nombre del sitio'), 'Playa de la Fontanilla');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));
  await waitFor(() => expect(api.createOuting).toHaveBeenCalled());
  expect(vi.mocked(api.createOuting).mock.calls[0][0]).toMatchObject({
    location: { lat: 36.27, lng: -6.09 },
    placeName: 'Playa de la Fontanilla',
  });
});

test('las capturas se añaden con sugerencias de la Pescadex y se guardan en la jornada', async () => {
  renderApp('/cuaderno');
  await fillBasics();
  await userEvent.click(screen.getByRole('button', { name: 'Marcar Conil en el mapa' }));
  await userEvent.click(screen.getByRole('button', { name: 'Añadir pez' }));
  const row = screen.getByTestId('past-catch-0');
  await userEvent.type(within(row).getByLabelText('Buscar especie'), 'dora');
  expect(within(row).queryByRole('button', { name: /Anguila/ })).toBeNull();
  await userEvent.click(within(row).getByRole('button', { name: /Dorada/ }));
  await userEvent.type(within(row).getByLabelText('Peso (kg)'), '1,5');
  await userEvent.upload(within(row).getByLabelText('Foto'), new File(['img'], 'f.jpg', { type: 'image/jpeg' }));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));

  await waitFor(() => expect(api.createCatch).toHaveBeenCalled());
  const outing = vi.mocked(api.createOuting).mock.calls[0][0];
  const c = vi.mocked(api.createCatch).mock.calls[0][0];
  expect(c).toMatchObject({ outingId: outing.id, speciesId: 'dorada', weightG: 1500, location: { lat: 36.27, lng: -6.09 } });
  expect(c.caughtAt).toBe(outing.startedAt);
  await waitFor(() => expect(api.addCatchPhoto).toHaveBeenCalledWith(c.id, expect.any(Blob)));
});

test('una fila de pez sin especie impide guardar', async () => {
  renderApp('/cuaderno');
  await fillBasics();
  await userEvent.click(screen.getByRole('button', { name: 'Añadir pez' }));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar jornada' }));
  expect(screen.getByText('Elige la especie de cada pez o quita la fila.')).toBeInTheDocument();
  expect(api.createOuting).not.toHaveBeenCalled();
});
