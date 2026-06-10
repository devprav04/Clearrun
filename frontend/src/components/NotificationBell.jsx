import { useState } from 'react';
import { Bell, AlertTriangle, Calendar, Wrench, FileText, X } from 'lucide-react';
import { useNotifications } from '../hooks/queries';

const ICON_MAP = {
  stock:       { Icon: AlertTriangle, color: 'var(--orange)' },
  calibration: { Icon: Calendar,      color: 'var(--purple)' },
  ticket:      { Icon: Wrench,        color: 'var(--red)'    },
  amc:         { Icon: FileText,      color: 'var(--yellow)' },
};

const SEVERITY_BG = {
  error:   'color-mix(in srgb,var(--red)    8%,transparent)',
  warning: 'color-mix(in srgb,var(--orange) 8%,transparent)',
  info:    'color-mix(in srgb,var(--blue)   8%,transparent)',
};
const SEVERITY_BORDER = {
  error:   'color-mix(in srgb,var(--red)    20%,transparent)',
  warning: 'color-mix(in srgb,var(--orange) 20%,transparent)',
  info:    'color-mix(in srgb,var(--blue)   20%,transparent)',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: alerts = [] } = useNotifications();
  const count = alerts.length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={`${count} notification${count !== 1 ? 's' : ''}`}
        style={{
          width: 32, height: 32, borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'var(--bg-3)' : 'transparent',
          border: '1px solid var(--line)',
          color: count > 0 ? 'var(--orange)' : 'var(--tx-3)',
          cursor: 'pointer', position: 'relative',
          transition: 'all .12s',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = count > 0 ? 'var(--orange)' : 'var(--tx-1)'; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = count > 0 ? 'var(--orange)' : 'var(--tx-3)'; } }}
      >
        <Bell size={14} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--orange)',
            boxShadow: '0 0 4px var(--orange)',
          }} />
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 320, maxHeight: 420, overflowY: 'auto',
            background: 'var(--bg-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 99,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: '1px solid var(--line)',
            }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx-1)' }}>
                Alerts {count > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 9999, background: 'color-mix(in srgb,var(--orange) 15%,transparent)', color: 'var(--orange)', marginLeft: 4 }}>{count}</span>}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)', display: 'flex' }}>
                <X size={13} />
              </button>
            </div>

            {count === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={24} color="var(--tx-3)" style={{ margin: '0 auto 8px', display: 'block', opacity: .4 }} />
                <p style={{ fontSize: '0.8125rem', color: 'var(--tx-3)' }}>All clear — no alerts</p>
              </div>
            ) : (
              <div style={{ padding: '8px 8px' }}>
                {alerts.map(alert => {
                  const { Icon, color } = ICON_MAP[alert.type] || { Icon: Bell, color: 'var(--tx-2)' };
                  return (
                    <div key={alert.id} style={{
                      display: 'flex', gap: 10, padding: '10px 10px',
                      borderRadius: 'var(--r-md)', marginBottom: 4,
                      background: SEVERITY_BG[alert.severity] || SEVERITY_BG.info,
                      border: `1px solid ${SEVERITY_BORDER[alert.severity] || SEVERITY_BORDER.info}`,
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 'var(--r-sm)',
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={13} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx-1)', lineHeight: 1.3 }}>{alert.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--tx-2)', marginTop: 2 }}>{alert.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
