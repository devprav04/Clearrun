import { useEffect, useState } from 'react';
import { Wrench, FileText, TestTube, Plus, AlertOctagon, X, Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = [
  { id: 'tickets', label: 'Breakdown Tickets', icon: AlertOctagon },
  { id: 'amc',     label: 'AMC Contracts',     icon: FileText  },
  { id: 'calibration', label: 'Calibration',   icon: TestTube  },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

/* ─── Modal shell ───────────────────────────────────────────────── */
function ModalShell({ title, icon: Icon, onClose, children }) {
  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 520, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon size={16} color="var(--tx-2)" />
            <span className="t-title">{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Ticket Modal ──────────────────────────────────────────────── */
function TicketModal({ ticket, onClose, onSuccess }) {
  const editing = Boolean(ticket);
  const [instruments, setInstruments] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    instrument: ticket?.instrument || '', priority: ticket?.priority || 'medium',
    status: ticket?.status || 'open', description: ticket?.description || '',
    assigned_to: ticket?.assigned_to || '', resolution_notes: ticket?.resolution_notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('instruments/?page_size=200').then(r => setInstruments(r.data?.results || r.data || []));
    api.get('auth/users/').then(r => setUsers(r.data?.results || r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.assigned_to) delete payload.assigned_to;
      if (editing) await api.patch(`maintenance/tickets/${ticket.id}/`, payload);
      else await api.post('maintenance/tickets/', payload);
      onSuccess(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save ticket.');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={editing ? 'Edit Ticket' : 'New Breakdown Ticket'} icon={AlertOctagon} onClose={onClose}>
      {error && <ErrBanner msg={error} />}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Instrument *">
          <select required value={form.instrument} onChange={set('instrument')} className="input">
            <option value="">Select instrument…</option>
            {instruments.map(i => <option key={i.id} value={i.id}>{i.name} ({i.serial_number})</option>)}
          </select>
        </FormField>
        <div className="grid-form">
          <FormField label="Priority">
            <select value={form.priority} onChange={set('priority')} className="input">
              {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}
            </select>
          </FormField>
          {editing && (
            <FormField label="Status">
              <select value={form.status} onChange={set('status')} className="input">
                {['open','assigned','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </FormField>
          )}
        </div>
        {editing && users.length > 0 && (
          <FormField label="Assign To">
            <select value={form.assigned_to} onChange={set('assigned_to')} className="input">
              <option value="">— Unassigned —</option>
              {users.filter(u => u.role === 'technician').map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Description *">
          <textarea required rows={3} value={form.description} onChange={set('description')} className="input" placeholder="Describe the issue…" />
        </FormField>
        {editing && (
          <FormField label="Resolution Notes">
            <textarea rows={2} value={form.resolution_notes} onChange={set('resolution_notes')} className="input" placeholder="Steps taken to resolve…" />
          </FormField>
        )}
        <ModalActions onClose={onClose} loading={loading} label={editing ? 'Save Changes' : 'Create Ticket'} />
      </form>
    </ModalShell>
  );
}

/* ─── AMC Modal ─────────────────────────────────────────────────── */
function AmcModal({ contract, onClose, onSuccess }) {
  const editing = Boolean(contract);
  const [instruments, setInstruments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    instrument: contract?.instrument || '', vendor: contract?.vendor || '',
    contract_type: contract?.contract_type || 'comprehensive',
    start_date: contract?.start_date || '', end_date: contract?.end_date || '',
    contract_value: contract?.contract_value || '', status: contract?.status || 'active', notes: contract?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('instruments/?page_size=200').then(r => setInstruments(r.data?.results || r.data || []));
    api.get('vendors/?page_size=200').then(r => setVendors(r.data?.results || r.data || []));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (editing) await api.patch(`maintenance/amc/${contract.id}/`, form);
      else await api.post('maintenance/amc/', form);
      onSuccess(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save AMC contract.');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={editing ? 'Edit AMC Contract' : 'New AMC Contract'} icon={FileText} onClose={onClose}>
      {error && <ErrBanner msg={error} />}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid-form">
          <FormField label="Instrument *">
            <select required value={form.instrument} onChange={set('instrument')} className="input">
              <option value="">Select instrument…</option>
              {instruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </FormField>
          <FormField label="Vendor *">
            <select required value={form.vendor} onChange={set('vendor')} className="input">
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </FormField>
          <FormField label="Contract Type">
            <select value={form.contract_type} onChange={set('contract_type')} className="input">
              <option value="comprehensive">Comprehensive</option>
              <option value="non_comprehensive">Non-Comprehensive</option>
            </select>
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={set('status')} className="input">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending_renewal">Pending Renewal</option>
            </select>
          </FormField>
          <FormField label="Start Date *">
            <input type="date" required value={form.start_date} onChange={set('start_date')} className="input" />
          </FormField>
          <FormField label="End Date *">
            <input type="date" required value={form.end_date} onChange={set('end_date')} className="input" />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Contract Value (₹) *">
              <input type="number" required min="0" step="0.01" value={form.contract_value} onChange={set('contract_value')} className="input" placeholder="e.g. 250000" />
            </FormField>
          </div>
        </div>
        <FormField label="Notes">
          <textarea rows={2} value={form.notes} onChange={set('notes')} className="input" placeholder="Optional notes…" />
        </FormField>
        <ModalActions onClose={onClose} loading={loading} label={editing ? 'Save Changes' : 'Add Contract'} />
      </form>
    </ModalShell>
  );
}

/* ─── Calibration Modal ─────────────────────────────────────────── */
function CalibrationModal({ record, onClose, onSuccess }) {
  const editing = Boolean(record);
  const [instruments, setInstruments] = useState([]);
  const [form, setForm] = useState({
    instrument: record?.instrument || '', calibration_date: record?.calibration_date || '',
    next_due_date: record?.next_due_date || '', status: record?.status || 'valid', notes: record?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('instruments/?page_size=200').then(r => setInstruments(r.data?.results || r.data || []));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (editing) await api.patch(`maintenance/calibration/${record.id}/`, form);
      else await api.post('maintenance/calibration/', form);
      onSuccess(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save record.');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell title={editing ? 'Edit Calibration Record' : 'New Calibration Record'} icon={TestTube} onClose={onClose}>
      {error && <ErrBanner msg={error} />}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="Instrument *">
          <select required value={form.instrument} onChange={set('instrument')} className="input">
            <option value="">Select instrument…</option>
            {instruments.map(i => <option key={i.id} value={i.id}>{i.name} ({i.serial_number})</option>)}
          </select>
        </FormField>
        <div className="grid-form">
          <FormField label="Calibration Date *">
            <input type="date" required value={form.calibration_date} onChange={set('calibration_date')} className="input" />
          </FormField>
          <FormField label="Next Due Date *">
            <input type="date" required value={form.next_due_date} onChange={set('next_due_date')} className="input" />
          </FormField>
        </div>
        <FormField label="Status">
          <select value={form.status} onChange={set('status')} className="input">
            <option value="valid">Valid</option>
            <option value="expired">Expired</option>
            <option value="due_soon">Due Soon</option>
          </select>
        </FormField>
        <FormField label="Notes">
          <textarea rows={2} value={form.notes} onChange={set('notes')} className="input" placeholder="Optional notes…" />
        </FormField>
        <ModalActions onClose={onClose} loading={loading} label={editing ? 'Save Changes' : 'Add Record'} />
      </form>
    </ModalShell>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function FormField({ label, children }) {
  return (
    <div>
      <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  return (
    <div style={{ padding: '10px 12px', background: 'color-mix(in srgb,var(--red) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
      <p style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{msg}</p>
    </div>
  );
}

function ModalActions({ onClose, loading, label }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
      <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
        {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
        {label}
      </button>
    </div>
  );
}

/* ─── CRUD Table ────────────────────────────────────────────────── */
function CrudTable({ rows, columns, emptyIcon: Icon, emptyText, isAdmin, onEdit, onDelete }) {
  if (!rows.length) return (
    <div className="surface">
      <div className="empty-state">
        <div className="empty-state-icon"><Icon size={22} color="var(--tx-3)" /></div>
        <p className="t-body">{emptyText}</p>
      </div>
    </div>
  );
  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c.label}>{c.label}</th>)}
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {columns.map(c => <td key={c.label}>{c.render(row)}</td>)}
                {isAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <button onClick={() => onEdit(row)} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => onDelete(row)} className="btn btn-danger btn-sm" style={{ padding: '0 8px' }} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */
export default function Maintenance() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'manager';
  const [tab, setTab] = useState('tickets');
  const [data, setData] = useState({ tickets: [], amc: [], calibration: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, a, c] = await Promise.all([
        api.get('maintenance/tickets/?page_size=200'), api.get('maintenance/amc/?page_size=200'), api.get('maintenance/calibration/?page_size=200'),
      ]);
      setData({
        tickets: t.data?.results || t.data || [],
        amc: a.data?.results || a.data || [],
        calibration: c.data?.results || c.data || [],
      });
    } catch (_) { /* errors surface via empty state */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async () => {
    const { type, id } = deleteTarget;
    const ep = { ticket: `maintenance/tickets/${id}/`, amc: `maintenance/amc/${id}/`, cal: `maintenance/calibration/${id}/` };
    try { await api.delete(ep[type]); toast('Record deleted.', 'success'); setDeleteTarget(null); fetchAll(); }
    catch { toast('Failed to delete. Try again.', 'error'); }
  };

  const addButton = {
    tickets: isAdmin ? { label: 'New Ticket', action: () => setModal({ type: 'ticket' }) } : null,
    amc: isAdmin ? { label: 'Add Contract', action: () => setModal({ type: 'amc' }) } : null,
    calibration: isAdmin ? { label: 'Add Record', action: () => setModal({ type: 'cal' }) } : null,
  };

  const currentData = data[tab === 'tickets' ? 'tickets' : tab === 'amc' ? 'amc' : 'calibration'] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">Maintenance Hub</h1>
          <p className="t-body" style={{ marginTop: 2 }}>Manage tickets, AMC contracts and calibration</p>
        </div>
        {addButton[tab] && (
          <button onClick={addButton[tab].action} className="btn btn-primary"><Plus size={13} />{addButton[tab].label}</button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = data[id === 'tickets' ? 'tickets' : id === 'amc' ? 'amc' : 'calibration']?.length || 0;
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn${active ? ' active' : ''}`}>
              <Icon size={13} />
              {label}
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 9999,
                background: active ? 'color-mix(in srgb,var(--accent) 15%,transparent)' : 'var(--bg-4)',
                color: active ? 'var(--accent)' : 'var(--tx-3)',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="shimmer-box" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
      ) : (
        <>
          {tab === 'tickets' && (
            <CrudTable rows={data.tickets} emptyIcon={AlertOctagon} emptyText="No breakdown tickets found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'ticket', record: r })}
              onDelete={r => setDeleteTarget({ type: 'ticket', id: r.id, name: `Ticket #${r.id}` })}
              columns={[
                { label: '#', render: r => <span className="t-mono t-small">#{r.id}</span> },
                { label: 'Instrument', render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name || r.instrument}</span> },
                { label: 'Priority', render: r => <StatusBadge status={r.priority} /> },
                { label: 'Status', render: r => <StatusBadge status={r.status} /> },
                { label: 'Assigned To', render: r => <span>{r.assigned_to_name || '—'}</span> },
                { label: 'Description', render: r => <span className="t-body" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.description}</span> },
                { label: 'Reported', render: r => <span className="t-small">{r.reported_at?.slice(0,10) || '—'}</span> },
              ]}
            />
          )}
          {tab === 'amc' && (
            <CrudTable rows={data.amc} emptyIcon={FileText} emptyText="No AMC contracts found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'amc', record: r })}
              onDelete={r => setDeleteTarget({ type: 'amc', id: r.id, name: `AMC for ${r.instrument_name}` })}
              columns={[
                { label: 'Instrument', render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Vendor', render: r => <span>{r.vendor_name}</span> },
                { label: 'Type', render: r => <span style={{ textTransform: 'capitalize' }}>{r.contract_type?.replace(/_/g,' ')}</span> },
                { label: 'Start', render: r => <span className="t-small">{r.start_date}</span> },
                { label: 'End', render: r => <span className="t-small">{r.end_date}</span> },
                { label: 'Value', render: r => <span>₹{Number(r.contract_value||0).toLocaleString('en-IN')}</span> },
                { label: 'Expiry', render: r => {
                  const d = daysUntil(r.end_date);
                  return <span style={{ fontWeight: 600, color: d < 0 ? 'var(--red)' : d < 30 ? 'var(--orange)' : 'var(--tx-1)' }}>{d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d}d`}</span>;
                }},
                { label: 'Status', render: r => <StatusBadge status={r.status} /> },
              ]}
            />
          )}
          {tab === 'calibration' && (
            <CrudTable rows={data.calibration} emptyIcon={TestTube} emptyText="No calibration records found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'cal', record: r })}
              onDelete={r => setDeleteTarget({ type: 'cal', id: r.id, name: `Calibration for ${r.instrument_name}` })}
              columns={[
                { label: 'Instrument', render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Date', render: r => <span>{r.calibration_date}</span> },
                { label: 'Next Due', render: r => {
                  const d = daysUntil(r.next_due_date);
                  return <span style={{ color: d !== null && d < 30 ? 'var(--orange)' : 'var(--tx-1)', fontWeight: d !== null && d < 30 ? 600 : 400 }}>{r.next_due_date || '—'}</span>;
                }},
                { label: 'Calibrated By', render: r => <span>{r.calibrated_by_name || '—'}</span> },
                { label: 'Status', render: r => <StatusBadge status={r.status} /> },
                { label: 'Notes', render: r => <span className="t-small">{r.notes || '—'}</span> },
              ]}
            />
          )}
        </>
      )}

      {modal?.type === 'ticket' && <TicketModal ticket={modal.record} onClose={() => setModal(null)} onSuccess={fetchAll} />}
      {modal?.type === 'amc'    && <AmcModal contract={modal.record} onClose={() => setModal(null)} onSuccess={fetchAll} />}
      {modal?.type === 'cal'    && <CalibrationModal record={modal.record} onClose={() => setModal(null)} onSuccess={fetchAll} />}
      {deleteTarget && (
        <ConfirmDialog title="Confirm Delete" message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
