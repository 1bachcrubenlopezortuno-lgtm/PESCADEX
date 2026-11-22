import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { TabBar } from './ui/TabBar';

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

function Shell() {
  return (
    <div className="shell">
      <main className="content">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Placeholder title="Entrar" />} />
      <Route path="/unirse" element={<Placeholder title="Unirse" />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Placeholder title="Pescadex" />} />
        <Route path="/especie/:id" element={<Placeholder title="Especie" />} />
        <Route path="/cuaderno" element={<Placeholder title="Cuaderno" />} />
        <Route path="/jornada/:id" element={<Placeholder title="Jornada" />} />
        <Route path="/registrar" element={<Placeholder title="Registrar" />} />
        <Route path="/captura/:id" element={<Placeholder title="Captura" />} />
        <Route path="/perfil" element={<Placeholder title="Perfil" />} />
        <Route path="/perfil/:userId" element={<Placeholder title="Perfil" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
