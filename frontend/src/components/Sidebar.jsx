import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Microscope, Truck, ClipboardList, Archive,
  TrendingUp, UsersRound, ScrollText, SlidersHorizontal,
  FlaskConical, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const CORE = [
  { to: '/',            icon: LayoutGrid,    label: 'Dashboard'   },
  { to: '/instruments', icon: Microscope,    label: 'Instruments' },
  { to: '/vendors',     icon: Truck,         label: 'Vendors'     },
  { to: '/maintenance', icon: ClipboardList, label: 'Maintenance' },
  { to: '/inventory',   icon: Archive,       label: 'Inventory'   },
];

const ADMIN = [
  { to: '/reports',   icon: TrendingUp,        label: 'Reports'   },
  { to: '/users',     icon: UsersRound,        label: 'Users'     },
  { to: '/audit-log', icon: ScrollText,        label: 'Audit Log' },
  { to: '/settings',  icon: SlidersHorizontal, label: 'Settings'  },
];

function Item({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink to={to} end={to === '/'} title={collapsed ? label : undefined}>
      {({ isActive }) => (
        <span
          className={`nav-item${isActive ? ' active' : ''}`}
          style={{ justifyContent: collapsed ? 'center' : undefined, position: 'relative' }}
        >
          <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
          {collapsed && (
            <span style={{
              position: 'absolute', left: 'calc(100% + 10px)',
              background: 'var(--bg-3)', border: '1px solid var(--line-2)',
              color: 'var(--tx-1)', fontSize: '0.75rem', fontWeight: 500,
              padding: '5px 10px', borderRadius: 'var(--r-md)',
              whiteSpace: 'nowrap', pointerEvents: 'none',
              opacity: 0, transition: 'opacity .1s',
              boxShadow: '0 4px 12px rgba(0,0,0,.35)',
              zIndex: 200,
            }} className="nav-tooltip">
              {label}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAdmin = user?.role === 'manager' || user?.role === 'admin' || user?.is_superuser;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sb') === '1'
  );

  useEffect(() => { localStorage.setItem('sb', collapsed ? '1' : '0'); }, [collapsed]);

  return (
    <>
      <style>{`
        .nav-item:hover .nav-tooltip { opacity: 1 !important; }
      `}</style>

      <aside style={{
        width: collapsed ? 52 : 216,
        minHeight: '100vh', flexShrink: 0,
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        transition: 'width .2s cubic-bezier(.4,0,.2,1)',
        overflow: 'visible', position: 'relative',
      }}>

        {/* Brand */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 12px' : '0 14px', gap: 10,
          borderBottom: '1px solid var(--line)', overflow: 'hidden',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--r-md)',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px var(--brand-glow)',
          }}>
            {settings?.logo_url
              ? <img src={settings.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} alt="" />
              : <FlaskConical size={14} color="#fff" strokeWidth={2.2} />}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <p style={{
                fontSize: '0.875rem', fontWeight: 700, color: 'var(--tx-1)',
                lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {settings?.company_name || 'CleanRun'}
              </p>
              <p style={{
                fontSize: '0.625rem', color: 'var(--tx-3)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2,
              }}>
                IMMS
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1, padding: '10px 6px',
          display: 'flex', flexDirection: 'column', gap: 1,
          overflowY: 'auto', overflowX: 'visible',
        }}>
          {!collapsed && (
            <p className="t-label" style={{ padding: '4px 8px 6px', letterSpacing: '0.1em' }}>
              Overview
            </p>
          )}
          {CORE.map(i => <Item key={i.to} {...i} collapsed={collapsed} />)}

          {isAdmin && (
            <>
              <div className="divider" style={{ margin: '8px 4px' }} />
              {!collapsed && (
                <p className="t-label" style={{ padding: '4px 8px 6px', letterSpacing: '0.1em' }}>
                  Admin
                </p>
              )}
              {ADMIN.map(i => <Item key={i.to} {...i} collapsed={collapsed} />)}
            </>
          )}
        </nav>

        {/* Status footer */}
        <div style={{
          height: 44, borderTop: '1px solid var(--line)',
          display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 19px' : '0 14px', gap: 8,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 6px var(--green)',
            flexShrink: 0,
          }} />
          {!collapsed && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--tx-3)', letterSpacing: '0.02em' }}>
              Online · v2.0
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            position: 'absolute', right: -13, top: 72,
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            color: 'var(--tx-3)', cursor: 'pointer', zIndex: 10,
            transition: 'color .12s, border-color .12s, background .12s',
            boxShadow: 'var(--shadow-md)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--tx-1)';
            e.currentTarget.style.borderColor = 'var(--brand)';
            e.currentTarget.style.background = 'var(--bg-3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--tx-3)';
            e.currentTarget.style.borderColor = 'var(--line-2)';
            e.currentTarget.style.background = 'var(--bg-2)';
          }}
        >
          {collapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
        </button>
      </aside>
    </>
  );
}
