import { useRef, useEffect } from 'react';
import { useState } from 'react';
import { User, Camera, Lock, Save, Eye, EyeOff, Wrench, BadgeCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  first_name:  z.string().optional(),
  last_name:   z.string().optional(),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  phone:       z.string().optional(),
  department:  z.string().optional(),
  employee_id: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Required'),
  new_password:     z.string().min(8, 'At least 8 characters'),
  confirm:          z.string().min(1, 'Required'),
}).refine(d => d.new_password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

const ROLE_META = {
  manager:    { label: 'Lab Manager / Admin',    color: 'var(--purple)', icon: BadgeCheck },
  technician: { label: 'Maintenance Technician', color: 'var(--blue)',   icon: Wrench     },
  employee:   { label: 'Lab Employee',           color: 'var(--green)',  icon: User        },
};

function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface" style={{ padding: 24 }}>
      <div className="flex items-center gap-2 mb-5">
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
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [showPw, setShowPw] = useState({ current_password: false, new_password: false, confirm: false });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: '', last_name: '', email: '', phone: '', department: '', employee_id: '' },
  });

  const pwForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  });

  useEffect(() => {
    api.get('auth/me/').then(r => {
      const d = r.data;
      profileForm.reset({
        first_name:  d.first_name  || '',
        last_name:   d.last_name   || '',
        email:       d.email       || '',
        phone:       d.phone       || '',
        department:  d.department  || '',
        employee_id: d.employee_id || '',
      });
      if (d.profile_picture_url) setAvatarPreview(d.profile_picture_url);
    });
  }, []);

  const profileValues = profileForm.watch();
  const initials = user ? (`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`).toUpperCase() || user.username?.[0]?.toUpperCase() : '?';
  const meta = ROLE_META[user?.role] || ROLE_META.employee;
  const RoleIcon = meta.icon;

  const onSaveProfile = async (data) => {
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile) fd.append('profile_picture', avatarFile);
      await api.patch('auth/me/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Profile updated successfully.', 'success');
    } catch { toast('Failed to save profile.', 'error'); }
  };

  const onChangePassword = async ({ current_password, new_password }) => {
    try {
      await api.post('auth/me/change-password/', { current_password, new_password });
      toast('Password changed successfully.', 'success');
      pwForm.reset();
    } catch (err) {
      toast(err.response?.data?.current_password?.[0] || err.response?.data?.detail || 'Failed to change password.', 'error');
    }
  };

  const inputCls = 'bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }} className="page-enter">
      <div>
        <h1 className="t-heading">My Profile</h1>
        <p className="t-body mt-0.5">Manage your account information and security</p>
      </div>

      {/* Avatar card */}
      <div className="surface flex items-center gap-5" style={{ padding: 24 }}>
        <div className="relative flex-shrink-0">
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-3)', border: '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--tx-1)' }}>{initials}</span>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--tx-1)', border: '2px solid var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={11} color="var(--bg)" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (!f) return; setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }} />
        </div>
        <div>
          <p style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--tx-1)' }}>
            {profileValues.first_name || profileValues.last_name ? `${profileValues.first_name} ${profileValues.last_name}`.trim() : user?.username}
          </p>
          <p className="t-small mt-0.5">@{user?.username}</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '3px 10px', borderRadius: 'var(--r-sm)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: `color-mix(in srgb,${meta.color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${meta.color} 25%,transparent)` }}>
            <RoleIcon size={10} />{meta.label}
          </span>
          {profileValues.employee_id && <p className="t-small mt-1">ID: {profileValues.employee_id}</p>}
        </div>
      </div>

      <Section title="Personal Information" icon={User}>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="flex flex-col gap-3.5">
          <div className="grid-form">
            {[['first_name','First Name'],['last_name','Last Name']].map(([k,l]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <Label className="t-label">{l}</Label>
                <Input {...profileForm.register(k)} placeholder={l} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Email</Label>
            <Input {...profileForm.register('email')} type="email" placeholder="your@email.com" className={inputCls} />
            {profileForm.formState.errors.email && <p className="text-xs text-destructive">{profileForm.formState.errors.email.message}</p>}
          </div>
          <div className="grid-form">
            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Phone</Label>
              <Input {...profileForm.register('phone')} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Employee ID</Label>
              <Input {...profileForm.register('employee_id')} placeholder="EMP-001" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Department</Label>
            <Input {...profileForm.register('department')} placeholder="e.g. QC Laboratory" className={inputCls} />
          </div>
          <Button type="submit" disabled={profileForm.formState.isSubmitting} className="w-full mt-1 h-10 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            {profileForm.formState.isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Save Profile
          </Button>
        </form>
      </Section>

      <Section title="Change Password" icon={Lock}>
        <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="flex flex-col gap-3.5">
          {[
            { key: 'current_password', label: 'Current Password', placeholder: 'Enter current password' },
            { key: 'new_password',     label: 'New Password',     placeholder: 'Min. 8 characters'      },
            { key: 'confirm',          label: 'Confirm New',      placeholder: 'Repeat new password'    },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label className="t-label">{label}</Label>
              <div className="relative">
                <Input {...pwForm.register(key)} type={showPw[key] ? 'text' : 'password'} placeholder={placeholder}
                  className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] hover:text-[var(--tx-1)] transition-colors">
                  {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {pwForm.formState.errors[key] && <p className="text-xs text-destructive">{pwForm.formState.errors[key].message}</p>}
            </div>
          ))}
          <Button type="submit" disabled={pwForm.formState.isSubmitting} className="w-full mt-1 h-10 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            {pwForm.formState.isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Lock size={14} />}
            Change Password
          </Button>
        </form>
      </Section>
    </div>
  );
}
