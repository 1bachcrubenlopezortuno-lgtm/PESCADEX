import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';

test('muestra la barra inferior con las cuatro secciones', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  for (const label of ['Pescadex', 'Cuaderno', 'Registrar', 'Perfil']) {
    expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
  }
});
