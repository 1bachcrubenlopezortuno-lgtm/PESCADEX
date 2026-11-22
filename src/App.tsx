import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type AuthStatus } from './auth/AuthProvider';
import { JoinPage } from './auth/JoinPage';
import { LoginPage } from './auth/LoginPage';
import { CatchPage } from './catches/CatchPage';
import { RegisterPage } from './catches/RegisterPage';
import { NotebookPage } from './outings/NotebookPage';
import { OutingPage } from './outings/OutingPage';
import { PescadexPage } from './pescadex/PescadexPage';
import { SpeciesPage } from './pescadex/SpeciesPage';
import { TabBar } from './ui/TabBar';

const HOME: Record<Exclude<AuthStatus, 'loading'>, string> = { signed_out: '/login', needs_join: '/unirse', member: '/' };

function Gate({ want, children }: { want: AuthStatus; children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <p className="content muted">Cargando…</p>;
  if (status !== want) return <Navigate to={HOME[status]} replace />;
  return <>{children}</>;
}

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
      <Route path="/login" element={<Gate want="signed_out"><LoginPage /></Gate>} />
      <Route path="/unirse" element={<Gate want="needs_join"><JoinPage /></Gate>} />
      <Route element={<Gate want="member"><Shell /></Gate>}>
        <Route path="/" element={<PescadexPage />} />
        <Route path="/especie/:id" element={<SpeciesPage />} />
        <Route path="/cuaderno" element={<NotebookPage />} />
        <Route path="/jornada/:id" element={<OutingPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
        <Route path="/captura/:id" element={<CatchPage />} />
        <Route path="/perfil" element={<Placeholder title="Perfil" />} />
        <Route path="/perfil/:userId" element={<Placeholder title="Perfil" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
