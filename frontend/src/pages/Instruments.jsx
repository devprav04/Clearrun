import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FlaskConical, MapPin, Tag, ChevronRight, Plus, Pencil, Trash2, X, Upload, Download, CalendarCheck, Wand2, RefreshCw, Hash, Building2, Settings2, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_OPTIONS = ['operational', 'calibrating', 'broken_down', 'scheduled_maintenance', 'out_of_service'];
const STATUS_META = {
  operational:            { color: 'var(--green)',  label: 'Operational' },
  calibrating:            { color: 'var(--blue)',   label: 'Calibrating' },
  broken_down:            { color: 'var(--red)',    label: 'Broken Down' },
  scheduled_maintenance:  { color: 'var(--orange)', label: 'Scheduled Maintenance' },
  out_of_service:         { color: 'var(--tx-3)',   label: 'Out of Service' },
};

/* ── Labelled field wrapper ─────────────────────────────── */
function F({ label, children, span2, hint }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : {}}>
      <label style={{ display: 'block', marginBottom: 5, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tx-3)' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ marginTop: 4, fontSize: '0.6875rem', color: 'var(--tx-3)' }}>{hint}</p>}
    </div>
  );
}

/* ── Section divider ────────────────────────────────────── */
function Divider({ icon: Icon, label }) {
  return (
    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 2px', borderTop: '1px solid var(--line)', marginTop: 4 }}>
      <Icon size={12} color="var(--accent)" />
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent)' }}>{label}</span>
    </div>
  );
}

function InstrumentModal({ instrument, vendors, onClose, onSuccess }) {
  const editing = Boolean(instrument);
  const [form, setForm] = useState({
    name: instrument?.name || '', model: instrument?.model || '',
    serial_number: instrument?.serial_number || '', manufacturer: instrument?.manufacturer || '',
    installation_date: instrument?.installation_date || '', location: instrument?.location || '',
    status: instrument?.status || 'operational', vendor: instrument?.vendor || '', notes: instrument?.notes || '',
  });
  const [instType, setInstType] = useState('');
  const [codePreview, setCodePreview] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [addCal, setAddCal] = useState(false);
  const [calForm, setCalForm] = useState({ calibration_date: '', next_due_date: '', calibrated_by_vendor: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCal = k => e => setCalForm(f => ({ ...f, [k]: e.target.value }));

  const fetchNextCode = useCallback(async (type) => {
    if (!type) { setCodePreview(''); return; }
    setCodeLoading(true);
    try {
      const res = await api.get(`instruments/next-code/?type=${encodeURIComponent(type)}`);
      setCodePreview(res.data.code);
    } catch { setCodePreview(''); }
    finally { setCodeLoading(false); }
  }, []);

  useEffect(() => {
    if (!editing) fetchNextCode(instType);
  }, [instType, editing, fetchNextCode]);

  const applyGeneratedCode = () => {
    if (codePreview) setForm(f => ({ ...f, manufacturer: codePreview }));
  };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      let instrId = instrument?.id;
      if (editing) { await api.patch(`instruments/${instrId}/`, form); }
      else {
        const res = await api.post('instruments/', form);
        instrId = res.data.id;
      }
      if (!editing && addCal && calForm.calibration_date && calForm.next_due_date) {
        await api.post('maintenance/calibration/', { instrument: instrId, ...calForm, calibrated_by_vendor: calForm.calibrated_by_vendor || null, status: 'valid' });
      }
      onSuccess(); onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? (typeof data === 'object' ? Object.values(data).flat().join(' ') : String(data)) : 'Failed to save instrument.');
    } finally { setLoading(false); }
  };

  const statusMeta = STATUS_META[form.status] || {};

  return (
    <div className="overlay" style={{ alignItems: 'flex-start', padding: '28px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 660, padding: 0, marginBottom: 32 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)', background: 'var(--bg-2)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--accent) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 25%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={17} color="var(--accent)" />
            </div>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tx-1)', lineHeight: 1.2 }}>{editing ? 'Edit Instrument' : 'Add Instrument'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginTop: 1 }}>{editing ? `Editing: ${instrument.name}` : 'Fill in the details below to register a new instrument'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--tx-3)' }}><X size={14} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Error banner */}
          {error && (
            <div style={{ padding: '10px 14px', background: 'color-mix(in srgb,var(--red) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</p>
            </div>
          )}

          <div className="grid-form" style={{ gap: 14 }}>
            {/* ── Basic Info ── */}
            <Divider icon={FlaskConical} label="Basic Information" />

            <F label="Instrument Name *">
              <input required placeholder="e.g. Gas Chromatograph" value={form.name} onChange={set('name')} className="input" />
            </F>
            <F label="Model *">
              <input required placeholder="e.g. Agilent 7890A" value={form.model} onChange={set('model')} className="input" />
            </F>
            <F label="Serial Number *">
              <input required placeholder="Unique serial number" value={form.serial_number} onChange={set('serial_number')} className="input t-mono" />
            </F>
            <F label="Location / Room *">
              <input required placeholder="e.g. Lab Room A" value={form.location} onChange={set('location')} className="input" />
            </F>

            {/* ── Identification ── */}
            <Divider icon={Hash} label="Identification & Coding" />

            {!editing && (
              <F label="Instrument Type Abbreviation" hint="2–6 letter abbreviation used to auto-generate the equipment code">
                <input value={instType} onChange={e => setInstType(e.target.value.toUpperCase())} className="input t-mono" placeholder="e.g. UVF, GC, HPLC" maxLength={10} />
              </F>
            )}

            <F label="Equipment Code / Tag" span2={editing}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder={!editing && instType ? 'Will auto-generate after typing type above' : 'e.g. CPCL/MAN/QC/UVF/1'}
                  value={form.manufacturer}
                  onChange={set('manufacturer')}
                  className="input t-mono"
                  style={{ flex: 1 }}
                />
                {!editing && codePreview && (
                  <button type="button" onClick={applyGeneratedCode} className="btn btn-ghost btn-sm" title={`Apply: ${codePreview}`} style={{ flexShrink: 0, padding: '0 12px', gap: 5 }}>
                    {codeLoading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Apply
                  </button>
                )}
              </div>
              {!editing && codePreview && (
                <div style={{ marginTop: 6, padding: '6px 10px', background: 'color-mix(in srgb,var(--accent) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 18%,transparent)', borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--tx-2)' }}>Suggested code:</span>
                  <button type="button" onClick={applyGeneratedCode} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700 }}>
                    {codeLoading ? '…' : codePreview}
                  </button>
                </div>
              )}
            </F>

            {/* ── Status & Assignment ── */}
            <Divider icon={Settings2} label="Status & Assignment" />

            <F label="Installation Date">
              <input type="date" value={form.installation_date} onChange={set('installation_date')} className="input" />
            </F>
            <F label="Status">
              <div style={{ position: 'relative' }}>
                <select value={form.status} onChange={set('status')} className="input" style={{ paddingLeft: 34 }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}
                </select>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: statusMeta.color, pointerEvents: 'none', flexShrink: 0 }} />
              </div>
            </F>
            <F label="Vendor / Supplier" span2>
              <select value={form.vendor} onChange={set('vendor')} className="input">
                <option value="">— No Vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>

            {/* ── Notes ── */}
            <Divider icon={StickyNote} label="Notes" />
            <F label="Internal Notes" span2>
              <textarea rows={3} value={form.notes} onChange={set('notes')} className="input" style={{ resize: 'vertical' }} placeholder="Observations, special requirements, history…" />
            </F>
          </div>

          {/* ── Calibration accordion ── */}
          {!editing && (
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginTop: 18 }}>
              <button type="button" onClick={() => setAddCal(v => !v)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: addCal ? 'color-mix(in srgb,var(--blue) 6%,transparent)' : 'var(--bg-3)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: addCal ? 'var(--blue)' : 'var(--tx-2)' }}>
                  <CalendarCheck size={14} color={addCal ? 'var(--blue)' : 'var(--tx-3)'} />
                  Add Initial Calibration Record
                  <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--tx-3)', fontStyle: 'italic' }}>optional</span>
                </span>
                {addCal ? <ChevronUp size={14} color="var(--blue)" /> : <ChevronDown size={14} color="var(--tx-3)" />}
              </button>
              {addCal && (
                <div className="grid-form" style={{ padding: '16px', background: 'color-mix(in srgb,var(--blue) 3%,var(--bg-3))', borderTop: '1px solid var(--line)', gap: 12 }}>
                  <F label="Calibration Date *">
                    <input type="date" value={calForm.calibration_date} onChange={setCal('calibration_date')} className="input" />
                  </F>
                  <F label="Next Due Date *">
                    <input type="date" value={calForm.next_due_date} onChange={setCal('next_due_date')} className="input" />
                  </F>
                  <F label="Calibrated By Vendor" span2>
                    <select value={calForm.calibrated_by_vendor} onChange={setCal('calibrated_by_vendor')} className="input">
                      <option value="">— Internal / Not specified —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </F>
                  <F label="Calibration Notes" span2>
                    <input value={calForm.notes} onChange={setCal('notes')} className="input" placeholder="Certificate number, lab, observations…" />
                  </F>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
              {loading
                ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                : <FlaskConical size={13} />}
              {editing ? 'Save Changes' : 'Add Instrument'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Instruments() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'manager';
  const navigate = useNavigate();

  const [instruments, setInstruments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [instRes, vendorRes] = await Promise.all([
        api.get('instruments/?page_size=200'),
        isAdmin ? api.get('vendors/?page_size=200') : Promise.resolve({ data: [] }),
      ]);
      setInstruments(instRes.data?.results || instRes.data || []);
      setVendors(vendorRes.data?.results || vendorRes.data || []);
    } catch { setInstruments([]); setVendors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleExport = async () => {
    try {
      const res = await api.get('instruments/export/', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `instruments_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast('Export failed.', 'error'); }
  };

  const handleImport = async e => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await api.post('instruments/import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { created, updated, errors } = res.data;
      toast(`Import done: ${created} created, ${updated} updated${errors ? `, ${errors} errors` : ''}.`, errors ? 'warning' : 'success');
      fetchAll();
    } catch { toast('Import failed. Check file format.', 'error'); }
    finally { setImporting(false); if (importRef.current) importRef.current.value = ''; }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`instruments/${deleteTarget.id}/`);
      toast('Instrument deleted.', 'success');
      setDeleteTarget(null); fetchAll();
    } catch { toast('Failed to delete instrument.', 'error'); }
  };

  const filtered = instruments.filter(inst => {
    const q = search.toLowerCase();
    const matchSearch = !q || inst.name?.toLowerCase().includes(q) || inst.serial_number?.toLowerCase().includes(q) || inst.model?.toLowerCase().includes(q) || inst.location?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="shimmer-box" style={{ width: 200, height: 32, borderRadius: 'var(--r-md)' }} />
        <div className="shimmer-box" style={{ width: 120, height: 32, borderRadius: 'var(--r-md)' }} />
      </div>
      <div className="shimmer-box" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">Instruments</h1>
          <p className="t-body" style={{ marginTop: 2 }}>{instruments.length} instruments in laboratory</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleExport} className="btn btn-ghost"><Download size={13} />Export Excel</button>
            <button onClick={() => importRef.current?.click()} disabled={importing} className="btn btn-ghost">
              {importing ? <span style={{ width: 13, height: 13, border: '2px solid var(--tx-3)', borderTopColor: 'var(--tx-1)', borderRadius: '50%' }} className="animate-spin" /> : <Upload size={13} />}
              Import Excel
            </button>
            <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
            <button onClick={() => setModal({ mode: 'add' })} className="btn btn-primary"><Plus size={13} />Add Instrument</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="page-toolbar">
        <div className="toolbar-search">
          <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search by name, serial, model, location…" value={search} onChange={e => setSearch(e.target.value)}
            className="input" style={{ paddingLeft: 32 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input" style={{ width: 'auto', minWidth: 140 }}>
          {['all', ...STATUS_OPTIONS].map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
        </select>
      </div>

      <p className="t-small">{filtered.length} results</p>

      {filtered.length === 0 ? (
        <div className="surface">
          <div className="empty-state">
            <div className="empty-state-icon"><FlaskConical size={22} color="var(--tx-3)" /></div>
            <p className="t-body">No instruments found</p>
          </div>
        </div>
      ) : (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['Name', 'Serial Number', 'Model', 'Location', 'Status', 'Vendor', ''].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--blue) 12%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FlaskConical size={14} color="var(--blue)" />
                        </div>
                        <span style={{ fontWeight: 500 }}>{inst.name}</span>
                      </div>
                    </td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)} className="t-mono t-small" style={{ color: 'var(--tx-2)' }}>{inst.serial_number}</td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>{inst.model}</td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="var(--tx-3)" />{inst.location}
                      </span>
                    </td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}><StatusBadge status={inst.status} /></td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>{inst.vendor_name || '—'}</td>
                    <td>
                      {isAdmin ? (
                        <div style={{ display: 'flex', gap: 6, opacity: 0 }} className="row-actions"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <button onClick={e => { e.stopPropagation(); setModal({ mode: 'edit', instrument: inst }); }}
                            className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }} title="Edit"><Pencil size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(inst); }}
                            className="btn btn-danger btn-sm" style={{ padding: '0 8px' }} title="Delete"><Trash2 size={12} /></button>
                        </div>
                      ) : <ChevronRight size={14} color="var(--tx-3)" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <InstrumentModal instrument={modal.mode === 'edit' ? modal.instrument : null} vendors={vendors} onClose={() => setModal(null)} onSuccess={fetchAll} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Instrument"
          message={`Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.serial_number})? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}

      <style>{`.data-table tbody tr:hover .row-actions { opacity: 1 !important; }`}</style>
    </div>
  );
}
