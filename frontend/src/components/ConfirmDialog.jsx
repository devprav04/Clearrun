import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: danger
              ? 'color-mix(in srgb,var(--red) 12%,transparent)'
              : 'color-mix(in srgb,var(--blue) 12%,transparent)',
            border: `1px solid ${danger
              ? 'color-mix(in srgb,var(--red) 25%,transparent)'
              : 'color-mix(in srgb,var(--blue) 25%,transparent)'}`,
          }}>
            <AlertTriangle size={16} color={danger ? 'var(--red)' : 'var(--blue)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="t-title">{title}</h3>
            <p className="t-body" style={{ marginTop: 4 }}>{message}</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, background: danger ? 'var(--red)' : 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 'var(--r-md)', height: 34,
              fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
