import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: { Icon: CheckCircle2, color: 'var(--green)' },
  error:   { Icon: XCircle,      color: 'var(--red)'   },
  warning: { Icon: AlertTriangle,color: 'var(--yellow)' },
  info:    { Icon: Info,         color: 'var(--blue)'  },
};

const BAR_COLOR = {
  success: 'var(--green)',
  error:   'var(--red)',
  warning: 'var(--yellow)',
  info:    'var(--blue)',
};

function ToastItem({ id, type = 'info', message, onDismiss }) {
  const { Icon, color } = ICONS[type] || ICONS.info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <div className="animate-slide-in" style={{
      position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', width: 312, overflow: 'hidden',
      background: 'var(--bg-2)', border: '1px solid var(--line-2)',
      borderRadius: 'var(--r-lg)', boxShadow: '0 8px 24px rgba(0,0,0,.4)',
    }}>
      <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: '0.875rem', flex: 1, lineHeight: 1.4, color: 'var(--tx-1)' }}>{message}</p>
      <button onClick={() => onDismiss(id)} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
        <X size={13} />
      </button>
      <div className="animate-shrink" style={{
        position: 'absolute', bottom: 0, left: 0, height: 2,
        background: color, borderRadius: '0 0 var(--r-lg) var(--r-lg)',
      }} />
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 300,
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      }}>
        {toasts.map((t) => <ToastItem key={t.id} {...t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
