import { useState, useEffect } from 'react';
import { Lock, FlaskConical, Eye, EyeOff } from 'lucide-react';

const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'cpcl2025';
const SESSION_KEY   = '__cleanrun_access';

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput]       = useState('');
  const [error, setError]       = useState('');
  const [show, setShow]         = useState(false);
  const [shake, setShake]       = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === SITE_PASSWORD) setUnlocked(true);
  }, []);

  const handleSubmit = e => {
    e.preventDefault();
    if (input === SITE_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, SITE_PASSWORD);
      setUnlocked(true);
    } else {
      setError('Incorrect password. Please try again.');
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  };

  if (unlocked) return children;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
      padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Background decorations */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.06) 0%, transparent 70%)' }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        background: '#fff', borderRadius: 20, padding: '44px 40px', width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06)',
        border: '1px solid rgba(255,255,255,.8)',
        animation: shake ? 'shake .5s ease' : undefined,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(79,70,229,.4)',
          }}>
            <FlaskConical size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            CleanRun IMMS
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            CPCL Quality Control Laboratory<br />
            <span style={{ color: '#9ca3af' }}>Instrument Management System</span>
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af' }}>
            <Lock size={12} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Restricted Access</span>
          </div>
          <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 7 }}>
            Site Password
          </label>
          <div style={{ position: 'relative', marginBottom: error ? 10 : 18 }}>
            <input
              type={show ? 'text' : 'password'}
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              autoFocus
              autoComplete="current-password"
              placeholder="Enter password to access"
              style={{
                width: '100%', padding: '11px 42px 11px 14px',
                fontSize: '0.9375rem', border: `1.5px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                borderRadius: 10, outline: 'none', fontFamily: 'inherit',
                color: '#111827', background: error ? '#fff5f5' : '#fff',
                transition: 'border-color .15s, box-shadow .15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.12)'; }}
              onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%', padding: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontSize: '0.9375rem', fontWeight: 700, border: 'none',
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(79,70,229,.35)', transition: 'opacity .15s, transform .1s',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.9'}
            onMouseLeave={e => e.target.style.opacity = '1'}
            onMouseDown={e => e.target.style.transform = 'scale(0.99)'}
            onMouseUp={e => e.target.style.transform = 'scale(1)'}
          >
            Access System →
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: '#d1d5db' }}>
          Authorized personnel only · CPCL Internal
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-8px); }
          30%       { transform: translateX(8px); }
          45%       { transform: translateX(-6px); }
          60%       { transform: translateX(6px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
