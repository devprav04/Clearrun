import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';
import { LayoutGrid, Microscope, ClipboardList, Archive, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MOBILE_NAV = [
  { to: '/',            icon: LayoutGrid,    label: 'Home'        },
  { to: '/instruments', icon: Microscope,    label: 'Instruments' },
  { to: '/maintenance', icon: ClipboardList, label: 'Maintenance' },
  { to: '/inventory',   icon: Archive,       label: 'Inventory'   },
];

const TITLES = {
  '/':            'Dashboard',
  '/instruments': 'Instruments',
  '/vendors':     'Vendors',
  '/maintenance': 'Maintenance',
  '/inventory':   'Inventory',
  '/reports':     'Reports',
  '/users':       'User Management',
  '/audit-log':   'Audit Log',
  '/settings':    'Settings',
  '/profile':     'Profile',
};

function IconBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 32, height: 32, borderRadius: 'var(--r-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: '1px solid var(--line)',
        color: 'var(--tx-3)', cursor: 'pointer', transition: 'all .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--tx-1)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
    >
      {children}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconBtn onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </IconBtn>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Title — handle instrument detail routes
  const isInstrumentDetail = pathname.startsWith('/instruments/') && pathname !== '/instruments';
  const title = isInstrumentDetail ? 'Instrument Detail' : (TITLES[pathname] ?? 'CleanRun IMMS');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Desktop header */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 0 var(--line), 0 4px 16px rgba(0,0,0,.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 4, height: 16, borderRadius: 2,
              background: 'linear-gradient(180deg, var(--brand) 0%, var(--brand-hover) 100%)',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--tx-1)', letterSpacing: '-0.01em',
            }}>
              {title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </header>

        {/* Mobile header */}
        <header style={{
          display: 'none',
          height: 52, alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid var(--line)',
          background: 'var(--bg)', flexShrink: 0,
        }} className="mobile-header">
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--tx-1)' }}>CleanRun</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <ThemeToggle />
            <IconBtn onClick={() => { logout(); navigate('/login'); }} title="Sign out">
              <LogOut size={14} />
            </IconBtn>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }} className="page-enter">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'none', borderTop: '1px solid var(--line)',
        background: 'var(--bg)', zIndex: 90, height: 56,
      }} className="mobile-nav">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, fontSize: '0.6rem', fontWeight: 500,
            color: isActive ? 'var(--brand)' : 'var(--tx-3)', textDecoration: 'none',
          })}>
            {({ isActive }) => <>
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
              <span>{label}</span>
            </>}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (max-width: 767px) {
          aside { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-nav    { display: flex !important; }
          main { padding-bottom: 72px !important; }
          header:not(.mobile-header) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
