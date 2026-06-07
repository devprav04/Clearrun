import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Save, Shield, Wrench, User, Search, Lock } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';

const ROLE_META = {
  manager:    { label: 'Manager / Admin', color: 'var(--purple)', Icon: Shield },
  technician: { label: 'Technician',      color: 'var(--blue)',   Icon: Wrench },
  employee:   { label: 'Lab Employee',    color: 'var(--green)',  Icon: User   },
};

const EMPTY_FORM = { username: '', email: '', first_name: '', last_name: '', role: 'employee', phone: '', department: '', employee_id: '', password: '' };
const PERM_MODULES = [{ key: 'instruments', label: 'Instruments' }, { key: 'calibration', label: 'Calibration' }, { key: 'service', label: 'Service / Maintenance' }, { key: 'inventory', label: 'Inventory' }];

/* ─── Permissions Modal ─────────────────────────────────────────── */
function PermissionsModal({ user, onClose }) {
  const toast = useToast();
  const [perms, setPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get(`settings/permissions/${user.id}/`).then(r => setPerms(r.data)); }, [user.id]);

  const toggle = key => setPerms(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try { await api.patch(`settings/permissions/${user.id}/`, perms); toast('Permissions saved.', 'success'); onClose(); }
    catch { toast('Failed to save permissions.', 'error'); }
    finally { setSaving(false); }
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p className="t-title">Module Permissions</p>
            <p className="t-small" style={{ marginTop: 2 }}>{fullName} · @{user.username}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={15} /></button>
        </div>

        {!perms ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <span style={{ width: 18, height: 18, border: '2px solid var(--line-2)', borderTopColor: 'var(--tx-2)', borderRadius: '50%' }} className="animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PERM_MODULES.map(({ key, label }) => (
              <div key={key} style={{ padding: '12px 14px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)', marginBottom: 10 }}>{label}</p>
                <div style={{ display: 'flex', gap: 20 }}>
                  {['view', 'edit'].map(action => {
                    const permKey = `${key}_${action}`;
                    const checked = perms[permKey] ?? false;
                    return (
                      <label key={action} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(permKey)} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--tx-1)' }} />
                        <span style={{ fontSize: '0.8125rem', textTransform: 'capitalize', color: checked ? 'var(--tx-1)' : 'var(--tx-3)' }}>{action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 14px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>Reports</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={perms.reports_view ?? false} onChange={() => toggle('reports_view')} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: 'var(--tx-1)' }} />
                <span style={{ fontSize: '0.8125rem', color: perms.reports_view ? 'var(--tx-1)' : 'var(--tx-3)' }}>View</span>
              </label>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !perms} className="btn btn-primary" style={{ flex: 1 }}>
            {saving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={13} />}
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── User Modal ────────────────────────────────────────────────── */
function UserModal({ user, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(user);
  const [form, setForm] = useState(isEdit ? { ...EMPTY_FORM, ...user, password: '' } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) await api.patch(`auth/users/${user.id}/`, payload);
      else await api.post('auth/users/', payload);
      toast(isEdit ? 'User updated.' : 'User created.', 'success');
      onSaved(); onClose();
    } catch (err) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(' ') : 'Failed to save user.';
      toast(msg, 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 480, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span className="t-title">{isEdit ? 'Edit User' : 'Add New User'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['first_name','First Name'],['last_name','Last Name']].map(([k,l]) => (
              <div key={k}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{l}</label>
                <input value={form[k]} onChange={set(k)} className="input" placeholder={l} />
              </div>
            ))}
          </div>
          {[
            { key: 'username', label: 'Username *', required: true, placeholder: 'username' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'email@lab.com' },
          ].map(({ key, label, type, required, placeholder }) => (
            <div key={key}>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
              <input type={type||'text'} required={required} value={form[key]} onChange={set(key)} className="input" placeholder={placeholder} />
            </div>
          ))}
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Role *</label>
            <select required value={form.role} onChange={set('role')} className="input">
              <option value="employee">Lab Employee</option>
              <option value="technician">Maintenance Technician</option>
              <option value="manager">Manager / Admin</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Phone</label>
              <input value={form.phone} onChange={set('phone')} className="input" placeholder="+91 …" />
            </div>
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Employee ID</label>
              <input value={form.employee_id} onChange={set('employee_id')} className="input" placeholder="EMP-001" />
            </div>
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Department</label>
            <input value={form.department} onChange={set('department')} className="input" placeholder="QC Laboratory" />
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" value={form.password} onChange={set('password')} required={!isEdit} className="input" placeholder={isEdit ? 'Leave blank to keep' : 'Min. 8 characters'} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
              {saving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={13} />}
              {isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */
export default function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    api.get('auth/users/').then(r => setUsers(r.data?.results || r.data || [])).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async u => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try { await api.delete(`auth/users/${u.id}/`); toast(`User ${u.username} deleted.`, 'success'); fetchUsers(); }
    catch (err) { toast(err.response?.data?.detail || 'Failed to delete user.', 'error'); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.username?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.employee_id?.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="page-enter">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">User Management</h1>
          <p className="t-body" style={{ marginTop: 2 }}>Add, edit, and manage lab staff access</p>
        </div>
        <button onClick={() => setModal('add')} className="btn btn-primary"><Plus size={13} />Add User</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username, email, ID…"
            className="input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input" style={{ width: 'auto', minWidth: 120 }}>
          <option value="">All Roles</option>
          <option value="employee">Lab Employee</option>
          <option value="technician">Technician</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {/* Role summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="surface" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: meta.color }}>{count}</p>
              <p className="t-small" style={{ marginTop: 2 }}>{meta.label}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <span style={{ width: 20, height: 20, border: '2px solid var(--line-2)', borderTopColor: 'var(--tx-2)', borderRadius: '50%' }} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="t-body" style={{ textAlign: 'center', padding: '48px 0' }}>No users found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th><th>Role</th>
                  <th>Contact</th><th>Department</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const meta = ROLE_META[u.role] || ROLE_META.employee;
                  const Icon = meta.Icon;
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
                  const initials = fullName ? `${u.first_name?.[0]}${u.last_name?.[0]}`.toUpperCase() : u.username[0].toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                            {initials}
                          </div>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{fullName || u.username}</p>
                            <p className="t-small">@{u.username}{u.employee_id ? ` · ${u.employee_id}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                          borderRadius: 'var(--r-sm)', fontSize: '0.7rem', fontWeight: 600,
                          color: meta.color, background: `color-mix(in srgb,${meta.color} 10%,transparent)`,
                          border: `1px solid color-mix(in srgb,${meta.color} 25%,transparent)`,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <p style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>{u.email || '—'}</p>
                        <p className="t-small">{u.phone || ''}</p>
                      </td>
                      <td style={{ color: 'var(--tx-2)' }}>{u.department || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => setPermUser(u)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} title="Permissions"><Lock size={12} /></button>
                          <button onClick={() => setModal(u)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} title="Edit"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete(u)} className="btn btn-danger btn-sm" style={{ padding: '0 8px' }} title="Delete"><Trash2 size={12} /></button>
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

      {modal && <UserModal user={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSaved={fetchUsers} />}
      {permUser && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} />}
    </div>
  );
}
