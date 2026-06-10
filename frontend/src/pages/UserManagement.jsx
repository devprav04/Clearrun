import { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Shield, Wrench, User, Search, Lock, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useUsers, QK } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const ROLE_META = {
  manager:    { label: 'Manager / Admin', color: 'var(--purple)', Icon: Shield },
  technician: { label: 'Technician',      color: 'var(--blue)',   Icon: Wrench },
  employee:   { label: 'Lab Employee',    color: 'var(--green)',  Icon: User   },
};

const PERM_MODULES = [
  { key: 'instruments', label: 'Instruments'         },
  { key: 'calibration', label: 'Calibration'         },
  { key: 'service',     label: 'Service/Maintenance' },
  { key: 'inventory',   label: 'Inventory'           },
];

const inputCls  = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const selectCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';

function PermissionsModal({ user, onClose }) {
  const toast = useToast();
  const [perms,  setPerms]  = useState(null);
  const [saving, setSaving] = useState(false);

  useState(() => {
    api.get(`settings/permissions/${user.id}/`).then(r => setPerms(r.data));
  });

  const toggle = key => setPerms(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try { await api.patch(`settings/permissions/${user.id}/`, perms); toast('Permissions saved.', 'success'); onClose(); }
    catch { toast('Failed to save permissions.', 'error'); }
    finally { setSaving(false); }
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm bg-[var(--bg-2)] border-[var(--line-2)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--tx-1)]">Module Permissions</DialogTitle>
          <p className="t-small">{fullName} · @{user.username}</p>
        </DialogHeader>

        {!perms ? (
          <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-[var(--line-2)] border-t-[var(--tx-2)] rounded-full animate-spin" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {PERM_MODULES.map(({ key, label }) => (
              <div key={key} className="rounded-md px-3.5 py-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                <p className="text-sm font-medium text-[var(--tx-1)] mb-2.5">{label}</p>
                <div className="flex gap-5">
                  {['view', 'edit'].map(action => {
                    const pk = `${key}_${action}`;
                    const checked = perms[pk] ?? false;
                    return (
                      <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggle(pk)} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--brand)' }} />
                        <span className="text-xs capitalize" style={{ color: checked ? 'var(--tx-1)' : 'var(--tx-3)' }}>{action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md px-3.5 py-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
              <p className="text-sm font-medium text-[var(--tx-1)]">Reports</p>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={perms.reports_view ?? false} onChange={() => toggle('reports_view')} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--brand)' }} />
                <span className="text-xs" style={{ color: perms.reports_view ? 'var(--tx-1)' : 'var(--tx-3)' }}>View</span>
              </label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !perms} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const userSchema = z.object({
  username:    z.string().min(1, 'Required'),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  first_name:  z.string().optional(),
  last_name:   z.string().optional(),
  role:        z.enum(['employee', 'technician', 'manager']),
  phone:       z.string().optional(),
  employee_id: z.string().optional(),
  department:  z.string().optional(),
  password:    z.string().optional(),
});

function UserModal({ user, onClose, onSaved }) {
  const toast  = useToast();
  const isEdit = Boolean(user);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username:    user?.username    || '',
      email:       user?.email       || '',
      first_name:  user?.first_name  || '',
      last_name:   user?.last_name   || '',
      role:        user?.role        || 'employee',
      phone:       user?.phone       || '',
      employee_id: user?.employee_id || '',
      department:  user?.department  || '',
      password:    '',
    },
  });

  const onSave = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (isEdit) await api.patch(`auth/users/${user.id}/`, payload);
      else        await api.post('auth/users/', payload);
      toast(isEdit ? 'User updated.' : 'User created.', 'success');
      onSaved(); onClose();
    } catch (err) {
      const d = err.response?.data;
      toast(d ? Object.values(d).flat().join(' ') : 'Failed to save user.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[480px] bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-[var(--tx-1)]">{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <div className="grid-form">
            {[['first_name', 'First Name'], ['last_name', 'Last Name']].map(([k, l]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <Label className="t-label">{l}</Label>
                <Input {...register(k)} placeholder={l} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Username *</Label>
            <Input {...register('username')} placeholder="username" className={inputCls} />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Email</Label>
            <Input {...register('email')} type="email" placeholder="email@lab.com" className={inputCls} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Role *</Label>
            <Controller name="role" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  <SelectItem value="employee">Lab Employee</SelectItem>
                  <SelectItem value="technician">Maintenance Technician</SelectItem>
                  <SelectItem value="manager">Manager / Admin</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid-form">
            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Phone</Label>
              <Input {...register('phone')} placeholder="+91 …" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="t-label">Employee ID</Label>
              <Input {...register('employee_id')} placeholder="EMP-001" className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Department</Label>
            <Input {...register('department')} placeholder="QC Laboratory" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
            <Input {...register('password')} type="password" placeholder={isEdit ? 'Leave blank to keep' : 'Min. 8 characters'} className={inputCls} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const toast = useToast();
  const qc    = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modal,      setModal]      = useState(null);
  const [permUser,   setPermUser]   = useState(null);

  const { data: users = [], isLoading } = useUsers();

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.users });

  const handleDelete = async u => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try { await api.delete(`auth/users/${u.id}/`); toast(`User ${u.username} deleted.`, 'success'); invalidate(); }
    catch (err) { toast(err.response?.data?.detail || 'Failed to delete user.', 'error'); }
  };

  const filtered = users.filter(u => {
    const q   = search.toLowerCase();
    const hit = !q || u.username?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.employee_id?.toLowerCase().includes(q);
    return hit && (roleFilter === 'all' || u.role === roleFilter);
  });

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="t-heading">User Management</h1>
          <p className="t-body mt-0.5">Add, edit, and manage lab staff access</p>
        </div>
        <Button onClick={() => setModal('add')} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
          <Plus size={13} />Add User
        </Button>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, email, ID…"
            className={`h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] pl-8`} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="employee">Lab Employee</SelectItem>
            <SelectItem value="technician">Technician</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid-3">
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="surface text-center" style={{ padding: '14px 16px' }}>
              <p className="text-[1.75rem] font-extrabold leading-none" style={{ letterSpacing: '-0.04em', color: meta.color }}>{count}</p>
              <p className="t-small mt-1">{meta.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><span className="w-5 h-5 border-2 border-[var(--line-2)] border-t-[var(--tx-2)] rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="t-body text-center py-12">No users found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Contact</th><th>Department</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const meta     = ROLE_META[u.role] || ROLE_META.employee;
                  const Icon     = meta.Icon;
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
                  const initials = fullName ? `${u.first_name?.[0]}${u.last_name?.[0]}`.toUpperCase() : u.username[0].toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: meta.color }}>{initials}</div>
                          <div>
                            <p className="text-sm font-medium text-[var(--tx-1)]">{fullName || u.username}</p>
                            <p className="t-small">@{u.username}{u.employee_id ? ` · ${u.employee_id}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.7rem] font-semibold uppercase tracking-wide" style={{ color: meta.color, background: `color-mix(in srgb,${meta.color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${meta.color} 25%,transparent)` }}>
                          <Icon size={10} />{meta.label}
                        </span>
                      </td>
                      <td>
                        <p className="text-sm text-[var(--tx-2)]">{u.email || '—'}</p>
                        <p className="t-small">{u.phone || ''}</p>
                      </td>
                      <td className="text-[var(--tx-2)]">{u.department || '—'}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setPermUser(u)} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]" title="Permissions"><Lock size={12} /></Button>
                          <Button variant="outline" size="sm" onClick={() => setModal(u)} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]" title="Edit"><Edit2 size={12} /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(u)} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && <UserModal user={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={invalidate} />}
      {permUser && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} />}
    </div>
  );
}
