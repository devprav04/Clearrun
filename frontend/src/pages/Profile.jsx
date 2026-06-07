import { useState, useRef, useEffect } from 'react';
import { User, Camera, Lock, Save, Eye, EyeOff, Wrench, BadgeCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const ROLE_META = {
  manager:    { label: 'Lab Manager / Admin', color: 'var(--purple)', icon: BadgeCheck },
  technician: { label: 'Maintenance Technician', color: 'var(--blue)', icon: Wrench },
  employee:   { label: 'Lab Employee', color: 'var(--green)', icon: User },
};

function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Icon size={15} color="var(--tx-3)" />
        <span className="t-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', department: '', employee_id: '' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current_password: false, new_password: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api.get('auth/me/').then(r => {
      const d = r.data;
      setForm({ first_name: d.first_name||'', last_name: d.last_name||'', email: d.email||'', phone: d.phone||'', department: d.department||'', employee_id: d.employee_id||'' });
      if (d.profile_picture_url) setAvatarPreview(d.profile_picture_url);
    });
  }, []);

  const initials = user ? `${user.first_name?.[0]||''}${user.last_name?.[0]||''}`.toUpperCase() || user.username?.[0]?.toUpperCase() : '?';
  const meta = ROLE_META[user?.role] || ROLE_META.employee;
  const RoleIcon = meta.icon;

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile) fd.append('profile_picture', avatarFile);
      await api.patch('auth/me/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Profile updated successfully.', 'success');
    } catch { toast('Failed to save profile.', 'error'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async e => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast('New passwords do not match.', 'error'); return; }
    setPwSaving(true);
    try {
      await api.post('auth/me/change-password/', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast('Password changed successfully.', 'success');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.current_password?.[0] || err.response?.data?.detail || 'Failed to change password.', 'error');
    } finally { setPwSaving(false); }
  };

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }} className="page-enter">
      <div>
        <h1 className="t-heading">My Profile</h1>
        <p className="t-body" style={{ marginTop: 2 }}>Manage your account information and security</p>
      </div>

      {/* Avatar card */}
      <div className="surface" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-3)', border: '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--tx-1)' }}>{initials}</span>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%',
            background: 'var(--tx-1)', border: '2px solid var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Camera size={11} color="var(--bg)" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} />
        </div>
        <div>
          <p style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--tx-1)' }}>
            {form.first_name || form.last_name ? `${form.first_name} ${form.last_name}`.trim() : user?.username}
          </p>
          <p className="t-small" style={{ marginTop: 2 }}>@{user?.username}</p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            padding: '3px 10px', borderRadius: 'var(--r-sm)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: meta.color, background: `color-mix(in srgb,${meta.color} 10%,transparent)`,
            border: `1px solid color-mix(in srgb,${meta.color} 25%,transparent)`,
          }}>
            <RoleIcon size={10} />{meta.label}
          </span>
          {form.employee_id && <p className="t-small" style={{ marginTop: 4 }}>ID: {form.employee_id}</p>}
        </div>
      </div>

      {/* Profile form */}
      <Section title="Personal Information" icon={User}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-form">
            {[['first_name','First Name'],['last_name','Last Name']].map(([k,l]) => (
              <div key={k}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{l}</label>
                <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="input" placeholder={l} />
              </div>
            ))}
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="your@email.com" />
          </div>
          <div className="grid-form">
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Employee ID</label>
              <input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} className="input" placeholder="EMP-001" />
            </div>
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Department</label>
            <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input" placeholder="e.g. QC Laboratory" />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {saving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={14} />}
            Save Profile
          </button>
        </form>
      </Section>

      {/* Password form */}
      <Section title="Change Password" icon={Lock}>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'new_password', label: 'New Password', placeholder: 'Min. 8 characters' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw[key] ? 'text' : 'password'} value={pwForm[key]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input" placeholder={placeholder} style={{ paddingRight: 36 }} />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 2,
                }}>
                  {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={pwSaving || !pwForm.current_password || !pwForm.new_password} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {pwSaving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Lock size={14} />}
            Change Password
          </button>
        </form>
      </Section>
    </div>
  );
}
