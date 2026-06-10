import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Sun, Moon, FlaskConical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login }          = useAuth();
  const { settings }       = useSettings();
  const { theme, toggle }  = useTheme();
  const navigate           = useNavigate();
  const { state }          = useLocation();
  const from               = state?.from?.pathname || '/';
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async ({ username, password }) => {
    setServerError('');
    try { await login(username, password); navigate(from, { replace: true }); }
    catch (err) { setServerError(err.response?.data?.detail || 'Invalid credentials.'); }
  };

  const inputCls = 'bg-[var(--bg-3)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)] h-10';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '20%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--brand) 8%, transparent) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '15%',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--purple) 6%, transparent) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Button
        variant="outline" size="icon"
        onClick={toggle}
        title="Toggle theme"
        className="absolute top-4 right-4 w-8 h-8 bg-[var(--bg-2)] border-[var(--line)] text-[var(--tx-3)]"
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </Button>

      <div style={{ width: '100%', maxWidth: 380, position: 'relative' }} className="page-enter">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--r-lg)',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
            boxShadow: '0 4px 16px var(--brand-glow)',
          }}>
            {settings?.logo_url
              ? <img src={settings.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <FlaskConical size={18} color="#fff" strokeWidth={2.2} />}
          </div>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tx-1)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {settings?.company_name || 'CleanRun'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--tx-3)', marginTop: 2, letterSpacing: '0.02em' }}>
              {settings?.tagline || 'Instrument Management System'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-xl)',
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, var(--brand) 0%, var(--purple) 100%)',
          }} />

          <h2 style={{
            fontSize: '1.25rem', fontWeight: 700,
            letterSpacing: '-0.025em', color: 'var(--tx-1)',
            marginBottom: 4, marginTop: 4,
          }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--tx-3)', marginBottom: 24 }}>
            Sign in to your account to continue
          </p>

          {serverError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-5" style={{
              background: 'color-mix(in srgb,var(--red) 8%,transparent)',
              border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)',
            }}>
              <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Username</Label>
              <Input
                {...register('username')}
                placeholder="Enter your username"
                autoFocus
                className={inputCls}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Password</Label>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 h-10"
              style={{
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
                boxShadow: isSubmitting ? 'none' : '0 2px 12px var(--brand-glow)',
                border: 'none',
              }}
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center mt-5" style={{ fontSize: '0.72rem', color: 'var(--tx-3)' }}>
          {settings?.company_name || 'CleanRun IMMS'} © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
