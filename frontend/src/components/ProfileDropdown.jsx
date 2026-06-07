import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, ScrollText, ChevronDown, UsersRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { manager: 'Manager', technician: 'Technician', employee: 'Employee' };
const ROLE_BADGE  = { manager: '#a855f7', technician: '#3b82f6', employee: '#22c55e' };

function getInitials(user) {
  if (!user) return '?';
  const f = user.first_name?.[0] || '';
  const l = user.last_name?.[0]  || '';
  return (f + l).toUpperCase() || user.username?.[0]?.toUpperCase() || '?';
}

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.username;

  const badgeColor = ROLE_BADGE[user.role] || 'var(--tx-2)';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
          borderRadius: 'var(--r-md)', cursor: 'pointer',
          background: open ? 'var(--bg-3)' : 'transparent',
          border: `1px solid ${open ? 'var(--line-2)' : 'transparent'}`,
          transition: 'all .12s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-3)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: badgeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {getInitials(user)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tx-1)' }}>{displayName}</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, marginTop: 3, color: badgeColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </div>
        <ChevronDown size={12} color="var(--tx-3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div className="animate-slide-in" style={{
            position: 'fixed', top: 52, right: 16, width: 216,
            borderRadius: 'var(--r-xl)', overflow: 'hidden', zIndex: 9999,
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            boxShadow: '0 12px 40px rgba(0,0,0,.5)',
          }}>
            {/* User info */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx-1)' }}>{displayName}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 2 }}>{user.email || user.username}</p>
              <span style={{
                display: 'inline-block', marginTop: 6, fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase', color: badgeColor,
                background: `${badgeColor}18`, border: `1px solid ${badgeColor}30`,
                padding: '2px 8px', borderRadius: 'var(--r-sm)',
              }}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>

            {/* Links */}
            <div style={{ padding: '4px 0' }}>
              {[
                { to: '/profile',   icon: User,       label: 'My Profile', always: true },
                { to: '/users',     icon: UsersRound, label: 'Manage Users', role: 'manager' },
                { to: '/audit-log', icon: ScrollText, label: 'Activity Log', role: 'manager' },
              ]
                .filter(item => item.always || user.role === item.role)
                .map(({ to, icon: Icon, label }) => (
                  <Link key={to} to={to} onClick={() => setOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                    fontSize: '0.8125rem', fontWeight: 500, color: 'var(--tx-2)',
                    textDecoration: 'none', transition: 'background .1s, color .1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--tx-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-2)'; }}
                  >
                    <Icon size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    {label}
                  </Link>
                ))}
            </div>

            {/* Sign out */}
            <div style={{ borderTop: '1px solid var(--line)', padding: '4px 0' }}>
              <button
                onClick={() => { setOpen(false); logout(); navigate('/login'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 16px', fontSize: '0.8125rem', fontWeight: 500,
                  color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb,var(--red) 8%,transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
