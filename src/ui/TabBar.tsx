import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const ICONS: Record<string, ReactNode> = {
  pescadex: (
    <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" {...stroke} /><circle cx="12" cy="10" r="3" {...stroke} /><path d="M8 17h8" {...stroke} /></svg>
  ),
  cuaderno: (
    <svg viewBox="0 0 24 24"><path d="M6 3h10l3 3v15H6z" {...stroke} /><path d="M9 10h7M9 14h7M9 18h4" {...stroke} /></svg>
  ),
  registrar: (
    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.6} /></svg>
  ),
  ranking: (
    <svg viewBox="0 0 24 24"><path d="M8 21V11h8v10M3 21v-6h5M16 21v-8h5M2 21h20" {...stroke} /></svg>
  ),
  perfil: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" {...stroke} /><path d="M4 21c1-5 5-7 8-7s7 2 8 7" {...stroke} /></svg>
  ),
};

const TABS = [
  { to: '/', label: 'Pescadex', icon: 'pescadex', end: true },
  { to: '/cuaderno', label: 'Cuaderno', icon: 'cuaderno' },
  { to: '/registrar', label: 'Registrar', icon: 'registrar', primary: true },
  { to: '/ranking', label: 'Ranking', icon: 'ranking' },
  { to: '/perfil', label: 'Perfil', icon: 'perfil' },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.label} to={t.to} end={t.end} className={t.primary ? 'tab primary' : 'tab'}>
          <span aria-hidden="true" className="tab-icon">{ICONS[t.icon]}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
