import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Pescadex', icon: '📖', end: true },
  { to: '/cuaderno', label: 'Cuaderno', icon: '📓' },
  { to: '/registrar', label: 'Registrar', icon: '🎣', primary: true },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.label} to={t.to} end={t.end} className={t.primary ? 'tab primary' : 'tab'}>
          <span aria-hidden="true" className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
