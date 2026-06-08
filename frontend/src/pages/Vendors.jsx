import { useEffect, useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, X, Search,
  Phone, Mail, Globe, Star, Package, FileText,
  CreditCard, ChevronDown, ChevronRight,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const SERVICE_TYPES = [
  { value: '', label: 'Select service type…' },
  { value: 'calibration',  label: 'Calibration' },
  { value: 'amc',          label: 'AMC / Maintenance' },
  { value: 'supply',       label: 'Parts Supply' },
  { value: 'repair',       label: 'Repair & Service' },
  { value: 'installation', label: 'Installation' },
  { value: 'multiple',     label: 'Multiple Services' },
];

const SERVICE_BADGE_COLOR = {
  calibration:  'var(--purple)',
  amc:          'var(--blue)',
  supply:       'var(--green)',
  repair:       'var(--orange)',
  installation: 'var(--yellow)',
  multiple:     'var(--tx-3)',
};

const EMPTY_FORM = {
  name: '', contact_person: '', email: '', phone: '', alternate_phone: '',
  address: '', website: '', service_type: '',
  gstin: '', pan: '', payment_terms: '', bank_name: '', bank_account: '', bank_ifsc: '',
  is_active: true, rating: '', notes: '',
};

/* ── Collapsible section ─────────────────────────────────── */
function SectionBlock({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={13} color="var(--blue)" />
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tx-2)' }}>{title}</span>
        </div>
        {open ? <ChevronDown size={13} color="var(--tx-3)" /> : <ChevronRight size={13} color="var(--tx-3)" />}
      </button>
      {open && (
        <div className="grid-form" style={{ padding: 14, gap: 12, background: 'var(--bg-3)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FField({ label, span2, children }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : {}}>
      <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

/* ── Star rating ─────────────────────────────────────────── */
function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(value === n ? '' : n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Star size={18} style={{ color: n <= (value || 0) ? '#f59e0b' : 'var(--line-2)', fill: n <= (value || 0) ? '#f59e0b' : 'none', transition: 'color .1s' }} />
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange('')} className="t-small" style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', marginLeft: 4 }}>clear</button>
      )}
    </div>
  );
}

/* ── Toggle switch ───────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
      background: checked ? 'var(--accent)' : 'var(--line-2)', transition: 'background .15s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        left: checked ? 21 : 3, transition: 'left .15s',
      }} />
    </button>
  );
}

/* ── Vendor modal ─────────────────────────────────────────── */
function VendorModal({ vendor, onClose, onSuccess }) {
  const editing = Boolean(vendor);
  const [form, setForm] = useState(editing ? { ...EMPTY_FORM, ...vendor } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (editing) { await api.patch(`vendors/${vendor.id}/`, form); toast('Vendor updated.', 'success'); }
      else { await api.post('vendors/', form); toast('Vendor added.', 'success'); }
      onSuccess(); onClose();
    } catch (err) { toast(err.response?.data?.detail || 'Failed to save vendor.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 640, padding: 0, marginBottom: 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--blue) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--blue) 25%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={15} color="var(--blue)" />
            </div>
            <span className="t-title">{editing ? 'Edit Vendor' : 'Add New Vendor'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>

          <SectionBlock title="Contact Information" icon={Phone}>
            <FField label="Vendor / Company Name *" span2>
              <input required value={form.name} onChange={set('name')} className="input" placeholder="e.g. ABC Instruments Pvt Ltd" />
            </FField>
            <FField label="Contact Person">
              <input value={form.contact_person} onChange={set('contact_person')} className="input" placeholder="e.g. Ramesh Kumar" />
            </FField>
            <FField label="Phone">
              <input type="tel" value={form.phone} onChange={set('phone')} className="input" placeholder="+91 98000 00000" />
            </FField>
            <FField label="Alternate Phone">
              <input type="tel" value={form.alternate_phone} onChange={set('alternate_phone')} className="input" placeholder="Optional" />
            </FField>
            <FField label="Email">
              <input type="email" value={form.email} onChange={set('email')} className="input" placeholder="info@vendor.com" />
            </FField>
            <FField label="Website" span2>
              <input type="url" value={form.website} onChange={set('website')} className="input" placeholder="https://vendor.com" />
            </FField>
            <FField label="Address" span2>
              <textarea rows={2} value={form.address} onChange={set('address')} className="input" style={{ resize: 'none' }} placeholder="Full address…" />
            </FField>
          </SectionBlock>

          <SectionBlock title="Service Details" icon={Package}>
            <FField label="Service Type">
              <select value={form.service_type} onChange={set('service_type')} className="input">
                {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FField>
            <FField label="Vendor Rating">
              <StarRating value={form.rating} onChange={v => setVal('rating', v)} />
            </FField>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>Active Vendor</p>
                <p className="t-small">Inactive vendors won't appear in selectors</p>
              </div>
              <Toggle checked={form.is_active} onChange={v => setVal('is_active', v)} />
            </div>
          </SectionBlock>

          <SectionBlock title="Business / Tax Details" icon={FileText} defaultOpen={false}>
            <FField label="GSTIN / Tax ID">
              <input value={form.gstin} onChange={set('gstin')} className="input" placeholder="22AAAAA0000A1Z5" />
            </FField>
            <FField label="PAN">
              <input value={form.pan} onChange={set('pan')} className="input" placeholder="AAAAA9999A" />
            </FField>
            <FField label="Payment Terms" span2>
              <input value={form.payment_terms} onChange={set('payment_terms')} className="input" placeholder="e.g. Net 30, 50% advance + 50% on delivery" />
            </FField>
          </SectionBlock>

          <SectionBlock title="Bank Details" icon={CreditCard} defaultOpen={false}>
            <FField label="Bank Name">
              <input value={form.bank_name} onChange={set('bank_name')} className="input" placeholder="e.g. HDFC Bank" />
            </FField>
            <FField label="Account Number">
              <input value={form.bank_account} onChange={set('bank_account')} className="input" placeholder="Account number" />
            </FField>
            <FField label="IFSC / Swift Code">
              <input value={form.bank_ifsc} onChange={set('bank_ifsc')} className="input" placeholder="e.g. HDFC0001234" />
            </FField>
          </SectionBlock>

          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Internal Notes</label>
            <textarea rows={3} value={form.notes} onChange={set('notes')} className="input" style={{ resize: 'none' }} placeholder="Any internal notes about this vendor…" />
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
              {editing ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Vendor detail drawer ─────────────────────────────────── */
function VendorDetail({ vendor, onClose, onEdit }) {
  const rating = vendor.rating || 0;

  const Row = ({ label, value }) => value ? (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <p className="t-small" style={{ width: 110, flexShrink: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--tx-3)' }}>{label}</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--tx-1)', flex: 1 }}>{value}</p>
    </div>
  ) : null;

  const badgeColor = SERVICE_BADGE_COLOR[vendor.service_type];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ height: '100%', width: '100%', maxWidth: 400, overflowY: 'auto', background: 'var(--bg-2)', borderLeft: '1px solid var(--line)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', flexShrink: 0 }}>
              {vendor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="t-title">{vendor.name}</p>
              {vendor.service_type && badgeColor && (
                <span style={{ display: 'inline-flex', marginTop: 5, padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: badgeColor, background: `color-mix(in srgb,${badgeColor} 10%,transparent)`, border: `1px solid color-mix(in srgb,${badgeColor} 25%,transparent)` }}>
                  {vendor.service_type_display || vendor.service_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div className="grid-3" style={{ gap: 10 }}>
            {[
              { label: 'Instruments', value: vendor.instruments_count ?? '—' },
              { label: 'Active AMC',  value: vendor.active_amc_count ?? '—' },
              { label: 'Rating',      value: rating ? `${rating}/5 ★` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '12px 8px', textAlign: 'center', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tx-1)' }}>{value}</p>
                <p className="t-small" style={{ marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: vendor.is_active ? 'color-mix(in srgb,var(--green) 8%,transparent)' : 'var(--bg-3)', border: `1px solid ${vendor.is_active ? 'color-mix(in srgb,var(--green) 25%,transparent)' : 'var(--line)'}`, borderRadius: 'var(--r-md)' }}>
            <span className="t-small">Vendor Status</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: vendor.is_active ? 'var(--green)' : 'var(--tx-3)' }}>
              {vendor.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Contact */}
          <div>
            <p className="t-label" style={{ marginBottom: 8 }}>Contact Information</p>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', padding: '0 12px' }}>
              <Row label="Contact" value={vendor.contact_person} />
              <Row label="Phone" value={vendor.phone} />
              <Row label="Alt. Phone" value={vendor.alternate_phone} />
              <Row label="Email" value={vendor.email} />
              <Row label="Website" value={vendor.website} />
              <Row label="Address" value={vendor.address} />
            </div>
          </div>

          {/* Business */}
          {(vendor.gstin || vendor.pan || vendor.payment_terms) && (
            <div>
              <p className="t-label" style={{ marginBottom: 8 }}>Business Details</p>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', padding: '0 12px' }}>
                <Row label="GSTIN" value={vendor.gstin} />
                <Row label="PAN" value={vendor.pan} />
                <Row label="Payment" value={vendor.payment_terms} />
              </div>
            </div>
          )}

          {/* Bank */}
          {(vendor.bank_name || vendor.bank_account) && (
            <div>
              <p className="t-label" style={{ marginBottom: 8 }}>Bank Details</p>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', padding: '0 12px' }}>
                <Row label="Bank" value={vendor.bank_name} />
                <Row label="Account" value={vendor.bank_account} />
                <Row label="IFSC" value={vendor.bank_ifsc} />
              </div>
            </div>
          )}

          {/* Notes */}
          {vendor.notes && (
            <div style={{ padding: '12px 14px', background: 'color-mix(in srgb,var(--yellow) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--yellow) 20%,transparent)', borderRadius: 'var(--r-md)' }}>
              <p className="t-label" style={{ marginBottom: 6 }}>Notes</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>{vendor.notes}</p>
            </div>
          )}

          <button onClick={() => { onClose(); onEdit(vendor); }} className="btn btn-ghost" style={{ width: '100%' }}>
            <Pencil size={13} /> Edit Vendor
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Service type badge ───────────────────────────────────── */
function ServiceBadge({ type, display }) {
  const color = SERVICE_BADGE_COLOR[type] || 'var(--tx-3)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color, background: `color-mix(in srgb,${color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${color} 20%,transparent)` }}>
      {display || type}
    </span>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function Vendors() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'manager';

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [modalVendor, setModalVendor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [detailVendor, setDetailVendor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchVendors = async () => {
    setLoading(true);
    try { const r = await api.get('vendors/?page_size=200'); setVendors(r.data?.results || r.data || []); }
    catch { toast('Failed to load vendors.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleDelete = async () => {
    try { await api.delete(`vendors/${deleteTarget.id}/`); toast('Vendor deleted.', 'success'); setDeleteTarget(null); fetchVendors(); }
    catch { toast('Delete failed.', 'error'); }
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || (v.contact_person || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
    const matchType = !filterType || v.service_type === filterType;
    return matchSearch && matchType;
  });

  const activeCount = vendors.filter(v => v.is_active).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">Vendors</h1>
          <p className="t-body" style={{ marginTop: 2 }}>
            {vendors.length} vendors · <span style={{ color: 'var(--green)', fontWeight: 600 }}>{activeCount} active</span>
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setModalVendor(null); setShowModal(true); }} className="btn btn-primary">
            <Plus size={13} /> Add Vendor
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="page-toolbar">
        <div className="toolbar-search">
          <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…" className="input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input" style={{ width: 'auto', minWidth: 160 }}>
          <option value="">All service types</option>
          {SERVICE_TYPES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table / Empty */}
      {loading ? (
        <div className="surface" style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 20, height: 20, border: '2px solid var(--line-2)', borderTopColor: 'var(--tx-2)', borderRadius: '50%' }} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface">
          <div className="empty-state">
            <div className="empty-state-icon"><Building2 size={22} color="var(--tx-3)" /></div>
            <p className="t-body">{isAdmin ? 'No vendors found. Add your first vendor.' : 'No vendors added yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Service Type</th>
                  <th>Contact</th>
                  <th>Phone / Email</th>
                  <th>Instruments</th>
                  <th>Active AMC</th>
                  <th>Rating</th>
                  <th>Status</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setDetailVendor(v)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', flexShrink: 0 }}>
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx-1)' }}>{v.name}</p>
                          {v.gstin && <p className="t-mono t-small">{v.gstin}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {v.service_type
                        ? <ServiceBadge type={v.service_type} display={v.service_type_display} />
                        : <span className="t-small">—</span>}
                    </td>
                    <td className="t-body">{v.contact_person || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {v.phone && <p className="t-small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} color="var(--tx-3)" />{v.phone}</p>}
                        {v.email && <p className="t-small" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} color="var(--tx-3)" />{v.email}</p>}
                        {!v.phone && !v.email && <span className="t-small">—</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx-1)' }}>{v.instruments_count ?? 0}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: v.active_amc_count > 0 ? 'var(--green)' : 'var(--tx-3)' }}>
                        {v.active_amc_count ?? 0}
                      </span>
                    </td>
                    <td>
                      {v.rating ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: '0.875rem' }}>
                          <Star size={13} style={{ fill: '#f59e0b' }} />{v.rating}
                        </span>
                      ) : <span className="t-small">—</span>}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: v.is_active ? 'var(--green)' : 'var(--tx-3)', background: v.is_active ? 'color-mix(in srgb,var(--green) 10%,transparent)' : 'var(--bg-3)', border: `1px solid ${v.is_active ? 'color-mix(in srgb,var(--green) 25%,transparent)' : 'var(--line)'}` }}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setModalVendor(v); setShowModal(true); }} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} title="Edit"><Pencil size={12} /></button>
                          <button onClick={() => setDeleteTarget(v)} className="btn btn-danger btn-sm" style={{ padding: '0 8px' }} title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <VendorModal vendor={modalVendor} onClose={() => { setShowModal(false); setModalVendor(null); }} onSuccess={fetchVendors} />
      )}
      {detailVendor && (
        <VendorDetail vendor={detailVendor} onClose={() => setDetailVendor(null)} onEdit={v => { setModalVendor(v); setShowModal(true); }} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Vendor"
          message={`Delete vendor "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
