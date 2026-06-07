import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Sun, Moon, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login }   = useAuth();
  const { settings} = useSettings();
  const { theme, toggle } = useTheme();
  const navigate    = useNavigate();
  const { state }   = useLocation();
  const from        = state?.from?.pathname || '/';

  const [form, setForm]     = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(form.username, form.password); navigate(from, { replace: true }); }
    catch (err) { setError(err.response?.data?.detail || 'Invalid credentials.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>

      {/* Theme toggle */}
      <button onClick={toggle} title="Toggle theme" style={{
        position: 'absolute', top: 16, right: 16,
        width: 32, height: 32, borderRadius: 'var(--r-md)',
        background: 'var(--bg-2)', border: '1px solid var(--line)',
        color: 'var(--tx-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div style={{ width: '100%', maxWidth: 380 }} className="page-enter">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 8px color-mix(in srgb,#4f46e5 40%,transparent)' }}>
            {settings?.logo_url
              ? <img src={settings.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <FlaskConical size={17} color="#fff" strokeWidth={2} />}
          </div>
          <div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--tx-1)', lineHeight: 1.2 }}>{settings?.company_name || 'CleanRun'}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 1 }}>{settings?.tagline || 'Instrument Management System'}</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 28 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--tx-1)', marginBottom: 4 }}>Sign in</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tx-3)', marginBottom: 24 }}>Enter your credentials to continue</p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'color-mix(in srgb,var(--red) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
              <AlertCircle size={14} color="var(--red)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Username', key: 'username', type: 'text',     placeholder: 'Enter username', autoFocus: true  },
              { label: 'Password', key: 'password', type: showPw ? 'text' : 'password', placeholder: 'Enter password' },
            ].map(({ label, key, type, placeholder, autoFocus }) => (
              <div key={key}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={type} required autoFocus={autoFocus}
                    className="input" placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ paddingRight: key === 'password' ? 40 : undefined }}
                  />
                  {key === 'password' && (
                    <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 2 }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ marginTop: 4, width: '100%' }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 20 }}>
          {settings?.company_name || 'CleanRun IMMS'} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
