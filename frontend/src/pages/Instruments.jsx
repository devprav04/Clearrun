import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FlaskConical, MapPin, Tag, ChevronRight, Plus, Pencil, Trash2, X, Upload, Download, CalendarCheck, Wand2, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUS_OPTIONS = ['operational', 'calibrating', 'broken_down', 'scheduled_maintenance', 'out_of_service'];

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
      setError(data ? JSON.stringify(data) : 'Failed to save instrument.');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 640, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={17} color="var(--blue)" />
            <span className="t-title">{editing ? 'Edit Instrument' : 'Add Instrument'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', background: 'color-mix(in srgb,var(--red) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-form" style={{ gap: 14, marginBottom: 14 }}>
            {[
              { key: 'name', label: 'Instrument Name *', placeholder: 'e.g. Gas Chromatograph', required: true },
              { key: 'model', label: 'Model *', placeholder: 'e.g. Agilent 7890A', required: true },
              { key: 'serial_number', label: 'Serial Number *', placeholder: 'Unique serial number', required: true },
              { key: 'location', label: 'Location / Room *', placeholder: 'e.g. Lab Room A', required: true },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
                <input required={required} placeholder={placeholder} value={form[key]} onChange={set(key)} className="input" />
              </div>
            ))}

            {/* Instrument Type + Auto Code (new instruments only) */}
            {!editing && (
              <div>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>
                  Instrument Type Abbreviation
                  <span className="t-small" style={{ marginLeft: 6, color: 'var(--tx-3)' }}>e.g. UVF, GC, HPLC</span>
                </label>
                <input
                  value={instType}
                  onChange={e => setInstType(e.target.value.toUpperCase())}
                  className="input t-mono"
                  placeholder="UVF"
                  maxLength={10}
                />
              </div>
            )}

            {/* Equipment Code */}
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Equipment Code / Tag</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder={!editing && instType ? 'Auto-generated' : 'e.g. CPCL/MAN/QC/UVF/1'}
                  value={form.manufacturer}
                  onChange={set('manufacturer')}
                  className="input t-mono"
                  style={{ flex: 1 }}
                />
                {!editing && codePreview && (
                  <button
                    type="button"
                    onClick={applyGeneratedCode}
                    className="btn btn-ghost btn-sm"
                    title={`Use generated code: ${codePreview}`}
                    style={{ flexShrink: 0, padding: '0 10px' }}
                  >
                    {codeLoading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  </button>
                )}
              </div>
              {!editing && codePreview && (
                <p className="t-small" style={{ marginTop: 5 }}>
                  Generated:&nbsp;
                  <button type="button" onClick={applyGeneratedCode} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontSize: 'inherit', textDecoration: 'underline' }}>
                    {codePreview}
                  </button>
                  &nbsp;— click to apply
                </p>
              )}
            </div>

            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Installation Date</label>
              <input type="date" value={form.installation_date} onChange={set('installation_date')} className="input" />
            </div>
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Status</label>
              <select value={form.status} onChange={set('status')} className="input">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Vendor / Supplier</label>
              <select value={form.vendor} onChange={set('vendor')} className="input">
                <option value="">— No Vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={set('notes')} className="input" placeholder="Optional notes…" />
          </div>

          {!editing && (
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 16 }}>
              <button type="button" onClick={() => setAddCal(v => !v)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
                color: 'var(--tx-2)', fontSize: '0.875rem', fontWeight: 500, fontFamily: 'inherit',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarCheck size={14} color="var(--blue)" />
                  Add Initial Calibration Record
                </span>
                <span className="t-small">{addCal ? '▲ Hide' : '▼ Expand'}</span>
              </button>
              {addCal && (
                <div className="grid-form" style={{ padding: 14, background: 'var(--bg-3)', gap: 12 }}>
                  {[
                    { key: 'calibration_date', label: 'Calibration Date *', type: 'date' },
                    { key: 'next_due_date', label: 'Next Due Date *', type: 'date' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
                      <input type={type} value={calForm[key]} onChange={setCal(key)} className="input" />
                    </div>
                  ))}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Calibrated By Vendor</label>
                    <select value={calForm.calibrated_by_vendor} onChange={setCal('calibrated_by_vendor')} className="input">
                      <option value="">— Internal / Not specified —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Calibration Notes</label>
                    <input value={calForm.notes} onChange={setCal('notes')} className="input" placeholder="Certificate no., observations…" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
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

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('instruments/?page_size=200'),
      isAdmin ? api.get('vendors/?page_size=200') : Promise.resolve({ data: [] }),
    ]).then(([instRes, vendorRes]) => {
      setInstruments(instRes.data?.results || instRes.data || []);
      setVendors(vendorRes.data?.results || vendorRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
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
