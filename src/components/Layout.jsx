import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, PlusCircle, Zap, MessageSquare, Search, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Lead Database', icon: Database },
  { to: '/add', label: 'Add Lead', icon: PlusCircle },
  { to: '/audit', label: 'Brand Audit', icon: Zap },
  { to: '/outreach', label: 'Outreach', icon: MessageSquare },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <div className="mascot-avatar">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
              {/* Monster mascot placeholder - bold cyclops monster */}
              <ellipse cx="30" cy="34" rx="22" ry="20" fill="#1a1a2e"/>
              <ellipse cx="30" cy="28" rx="18" ry="16" fill="#16213e"/>
              {/* Horns */}
              <polygon points="15,18 11,4 21,14" fill="#39ff14"/>
              <polygon points="45,18 49,4 39,14" fill="#39ff14"/>
              {/* Big eye */}
              <circle cx="30" cy="26" r="10" fill="#39ff14"/>
              <circle cx="30" cy="26" r="6" fill="#0a0a1a"/>
              <circle cx="30" cy="26" r="3" fill="#ff6b00"/>
              <circle cx="32" cy="24" r="1.5" fill="white"/>
              {/* Mouth */}
              <path d="M20 38 Q25 44 30 42 Q35 44 40 38" stroke="#39ff14" strokeWidth="2" fill="none" strokeLinecap="round"/>
              {/* Teeth */}
              <rect x="24" y="38" width="3" height="4" fill="white" rx="1"/>
              <rect x="29" y="38" width="3" height="4" fill="white" rx="1"/>
              <rect x="34" y="38" width="3" height="4" fill="white" rx="1"/>
            </svg>
          </div>
          <div>
            <div className="logo-name">MONSTA</div>
            <div className="logo-sub">Lead Hunter</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="agency-tag">⚡ Monsta Media & Design</div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="main-wrap">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(o => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="topbar-title">Monsta Lead Hunter</div>
          <div className="topbar-badge">BETA</div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
