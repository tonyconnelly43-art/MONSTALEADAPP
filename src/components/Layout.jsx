import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, PlusCircle, Zap, MessageSquare, Menu, X } from 'lucide-react';
import { useState } from 'react';

const BASE = '/MONSTALEADAPP';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Lead Database', icon: Database },
  { to: '/add', label: 'Add Lead', icon: PlusCircle },
  { to: '/audit', label: 'Brand Audit', icon: Zap },
  { to: '/outreach', label: 'Outreach', icon: MessageSquare },
];

function MascotImage() {
  const [imgErr, setImgErr] = useState(false);

  if (!imgErr) {
    return (
      <img
        src={`${BASE}/images/monstaman google.png`}
        alt="Monsta mascot"
        width="52"
        height="52"
        style={{ objectFit: 'contain' }}
        onError={() => setImgErr(true)}
      />
    );
  }

  // Fallback SVG if no image uploaded yet
  return (
    <svg viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="56">
      <ellipse cx="10" cy="22" rx="7" ry="5" fill="#a01010" transform="rotate(-40 10 22)"/>
      <ellipse cx="5" cy="14" rx="4" ry="3" fill="#b01818" transform="rotate(-30 5 14)"/>
      <line x1="3" y1="10" x2="1" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5" y1="9" x2="4" y2="5" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="10" x2="7" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="50" cy="22" rx="7" ry="5" fill="#a01010" transform="rotate(40 50 22)"/>
      <ellipse cx="55" cy="14" rx="4" ry="3" fill="#b01818" transform="rotate(30 55 14)"/>
      <line x1="57" y1="10" x2="59" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="55" y1="9" x2="56" y2="5" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="53" y1="10" x2="53" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="30" cy="38" r="22" fill="#8B0000"/>
      <circle cx="30" cy="36" r="21" fill="#aa0000"/>
      <circle cx="30" cy="36" r="21" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      <circle cx="22" cy="32" r="7" fill="white"/>
      <circle cx="22" cy="32" r="4.5" fill="#111"/>
      <circle cx="23.5" cy="30" r="1.5" fill="white"/>
      <circle cx="38" cy="32" r="7" fill="white"/>
      <circle cx="38" cy="32" r="4.5" fill="#111"/>
      <circle cx="39.5" cy="30" r="1.5" fill="white"/>
      <path d="M20 43 Q30 52 40 43" fill="#1a0000"/>
      <rect x="23" y="43" width="4" height="5" fill="white" rx="1"/>
      <rect x="28" y="43" width="4" height="6" fill="white" rx="1"/>
      <rect x="33" y="43" width="4" height="5" fill="white" rx="1"/>
      <ellipse cx="22" cy="58" rx="7" ry="5" fill="#8B0000"/>
      <ellipse cx="38" cy="58" rx="7" ry="5" fill="#8B0000"/>
      <ellipse cx="20" cy="63" rx="6" ry="3" fill="#700000"/>
      <ellipse cx="40" cy="63" rx="6" ry="3" fill="#700000"/>
    </svg>
  );
}

function LogoImage() {
  const [imgErr, setImgErr] = useState(false);

  if (!imgErr) {
    return (
      <img
        src={`${BASE}/images/logo.png`}
        alt="Monsta Media & Design"
        height="36"
        style={{ objectFit: 'contain', maxWidth: 140 }}
        onError={() => setImgErr(true)}
      />
    );
  }

  return (
    <div>
      <div className="logo-name">MONSTA</div>
      <div className="logo-sub">Lead Hunter</div>
    </div>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <div className="mascot-avatar">
            <MascotImage />
          </div>
          <LogoImage />
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
          <div className="agency-tag">🔴 Monsta Media & Design</div>
        </div>
      </aside>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

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
