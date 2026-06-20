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
            <svg viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="56">
              {/* Left arm raised */}
              <ellipse cx="10" cy="22" rx="7" ry="5" fill="#a01010" transform="rotate(-40 10 22)"/>
              <ellipse cx="5" cy="14" rx="4" ry="3" fill="#b01818" transform="rotate(-30 5 14)"/>
              {/* Left claws */}
              <line x1="3" y1="10" x2="1" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="5" y1="9" x2="4" y2="5" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="7" y1="10" x2="7" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Right arm raised */}
              <ellipse cx="50" cy="22" rx="7" ry="5" fill="#a01010" transform="rotate(40 50 22)"/>
              <ellipse cx="55" cy="14" rx="4" ry="3" fill="#b01818" transform="rotate(30 55 14)"/>
              {/* Right claws */}
              <line x1="57" y1="10" x2="59" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="55" y1="9" x2="56" y2="5" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="53" y1="10" x2="53" y2="6" stroke="#cc2222" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Body - round furry */}
              <circle cx="30" cy="38" r="22" fill="#8B0000"/>
              <circle cx="30" cy="36" r="21" fill="#aa0000"/>
              {/* Fur texture spikes around body */}
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const x1 = 30 + 21 * Math.cos(rad);
                const y1 = 36 + 21 * Math.sin(rad);
                const x2 = 30 + 26 * Math.cos(rad);
                const y2 = 36 + 26 * Math.sin(rad);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cc1111" strokeWidth="3" strokeLinecap="round"/>;
              })}
              {/* White outline around body */}
              <circle cx="30" cy="36" r="21" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
              {/* Left eye white */}
              <circle cx="22" cy="32" r="7" fill="white"/>
              <circle cx="22" cy="32" r="4.5" fill="#111"/>
              <circle cx="23.5" cy="30" r="1.5" fill="white"/>
              {/* Right eye white */}
              <circle cx="38" cy="32" r="7" fill="white"/>
              <circle cx="38" cy="32" r="4.5" fill="#111"/>
              <circle cx="39.5" cy="30" r="1.5" fill="white"/>
              {/* Mouth open */}
              <path d="M20 43 Q30 52 40 43" fill="#1a0000"/>
              <path d="M20 43 Q30 52 40 43" stroke="#660000" strokeWidth="1" fill="none"/>
              {/* Teeth */}
              <rect x="23" y="43" width="4" height="5" fill="white" rx="1"/>
              <rect x="28" y="43" width="4" height="6" fill="white" rx="1"/>
              <rect x="33" y="43" width="4" height="5" fill="white" rx="1"/>
              {/* Legs */}
              <ellipse cx="22" cy="58" rx="7" ry="5" fill="#8B0000"/>
              <ellipse cx="38" cy="58" rx="7" ry="5" fill="#8B0000"/>
              {/* Feet */}
              <ellipse cx="20" cy="63" rx="6" ry="3" fill="#700000"/>
              <ellipse cx="40" cy="63" rx="6" ry="3" fill="#700000"/>
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
          <div className="agency-tag">🔴 Monsta Media & Design</div>
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
