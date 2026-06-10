import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FlaskConical, MapPin, Plus, Pencil, Trash2, Upload, Download, CalendarCheck, Wand2, RefreshCw, Hash, Building2, Settings2, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useInstruments, useVendors, QK } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const STATUS_OPTIONS = ['operational', 'calibrating', 'broken_down', 'scheduled_maintenance', 'out_of_service'];
const STATUS_META = {
  operational:           { color: 'var(--green)',  label: 'Operational'            },
  calibrating:           { color: 'var(--blue)',   label: 'Calibrating'            },
  broken_down:           { color: 'var(--red)',    label: 'Broken Down'            },
  scheduled_maintenance: { color: 'var(--orange)', label: 'Scheduled Maintenance'  },
  out_of_service:        { color: 'var(--tx-3)',   label: 'Out of Service'         },
};

const inputCls    = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const selectCls   = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';
const textareaCls = 'bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)] resize-vertical';

function FF({ label, span2, hint, children, error }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : {}}>
      <Label className="t-label mb-1.5 block">{label}</Label>
      {children}
      {hint  && <p className="text-[0.6875rem] text-[var(--tx-3)] mt-1">{hint}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function Divider({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 py-1" style={{ gridColumn: 'span 2', borderTop: '1px solid var(--line)', marginTop: 4 }}>
      <Icon size={12} color="var(--brand)" />
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--brand)' }}>{label}</span>
    </div>
  );
}

const instrumentSchema = z.object({
  name:              z.string().min(1, 'Required'),
  model:             z.string().min(1, 'Required'),
  serial_number:     z.string().min(1, 'Required'),
  location:          z.string().min(1, 'Required'),
  manufacturer:      z.string().optional(),
  installation_date: z.string().optional(),
  status:            z.string(),
  vendor:            z.union([z.string(), z.number()]).optional().transform(v => v || ''),
  notes:             z.string().optional(),
});

function InstrumentModal({ instrument, vendors, onClose, onSuccess }) {
  const editing = Boolean(instrument);
  const toast   = useToast();

  const [instType,    setInstType]    = useState('');
  const [codePreview, setCodePreview] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [addCal,      setAddCal]      = useState(false);
  const [calForm,     setCalForm]     = useState({ calibration_date: '', next_due_date: '', calibrated_by_vendor: '', notes: '' });

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(instrumentSchema),
    defaultValues: {
      name:              instrument?.name              || '',
      model:             instrument?.model             || '',
      serial_number:     instrument?.serial_number     || '',
      manufacturer:      instrument?.manufacturer      || '',
      installation_date: instrument?.installation_date || '',
      location:          instrument?.location          || '',
      status:            instrument?.status            || 'operational',
      vendor:            instrument?.vendor ? String(instrument.vendor) : '',
      notes:             instrument?.notes             || '',
    },
  });

  const status     = watch('status');
  const statusMeta = STATUS_META[status] || {};

  const fetchNextCode = useCallback(async (type) => {
    if (!type) { setCodePreview(''); return; }
    setCodeLoading(true);
    try { const res = await api.get(`instruments/next-code/?type=${encodeURIComponent(type)}`); setCodePreview(res.data.code); }
    catch { setCodePreview(''); }
    finally { setCodeLoading(false); }
  }, []);

  const onSave = async (data) => {
    try {
      let instrId = instrument?.id;
      if (editing) { await api.patch(`instruments/${instrId}/`, data); }
      else {
        const res = await api.post('instruments/', data);
        instrId = res.data.id;
      }
      if (!editing && addCal && calForm.calibration_date && calForm.next_due_date) {
        await api.post('maintenance/calibration/', { instrument: instrId, ...calForm, calibrated_by_vendor: calForm.calibrated_by_vendor || null, status: 'valid' });
      }
      toast(editing ? 'Instrument updated.' : 'Instrument added.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      const d = err.response?.data;
      toast(d ? (typeof d === 'object' ? Object.values(d).flat().join(' ') : String(d)) : 'Failed to save instrument.', 'error');
    }
  };

  const setCal = k => e => setCalForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[660px] bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[var(--line)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--brand) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--brand) 25%,transparent)' }}>
              <FlaskConical size={17} color="var(--brand)" />
            </div>
            <div>
              <DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Instrument' : 'Add Instrument'}</DialogTitle>
              <p className="t-small mt-0.5">{editing ? `Editing: ${instrument.name}` : 'Fill in the details to register a new instrument'}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="overflow-y-auto px-6 py-4 flex flex-col gap-0">
          <div className="grid-form gap-3.5">
            <Divider icon={FlaskConical} label="Basic Information" />
            <FF label="Instrument Name *" error={errors.name?.message}>
              <Input {...register('name')} placeholder="e.g. Gas Chromatograph" className={inputCls} />
            </FF>
            <FF label="Model *" error={errors.model?.message}>
              <Input {...register('model')} placeholder="e.g. Agilent 7890A" className={inputCls} />
            </FF>
            <FF label="Serial Number *" error={errors.serial_number?.message}>
              <Input {...register('serial_number')} placeholder="Unique serial number" className={`${inputCls} font-mono`} />
            </FF>
            <FF label="Location / Room *" error={errors.location?.message}>
              <Input {...register('location')} placeholder="e.g. Lab Room A" className={inputCls} />
            </FF>

            <Divider icon={Hash} label="Identification & Coding" />

            {!editing && (
              <FF label="Instrument Type Abbreviation" hint="2–6 letter abbreviation used to auto-generate the equipment code">
                <Input value={instType} onChange={e => { const v = e.target.value.toUpperCase(); setInstType(v); fetchNextCode(v); }} placeholder="e.g. UVF, GC, HPLC" maxLength={10} className={`${inputCls} font-mono`} />
              </FF>
            )}

            <FF label="Equipment Code / Tag" span2={editing}>
              <div className="flex gap-1.5">
                <Input {...register('manufacturer')} placeholder={!editing && instType ? 'Will auto-generate after typing type above' : 'e.g. CPCL/MAN/QC/UVF/1'} className={`${inputCls} font-mono flex-1`} />
                {!editing && codePreview && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setValue('manufacturer', codePreview)} title={`Apply: ${codePreview}`} className="flex-shrink-0 border-[var(--line-2)] text-[var(--tx-2)]">
                    {codeLoading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Apply
                  </Button>
                )}
              </div>
              {!editing && codePreview && (
                <div className="mt-1.5 flex items-center justify-between rounded px-2.5 py-1.5" style={{ background: 'color-mix(in srgb,var(--brand) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--brand) 18%,transparent)' }}>
                  <span className="text-xs text-[var(--tx-2)]">Suggested code:</span>
                  <button type="button" onClick={() => setValue('manufacturer', codePreview)} className="font-mono text-[0.8125rem] font-bold" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 0 }}>
                    {codeLoading ? '…' : codePreview}
                  </button>
                </div>
              )}
            </FF>

            <Divider icon={Settings2} label="Status & Assignment" />

            <FF label="Installation Date">
              <Input {...register('installation_date')} type="date" className={inputCls} />
            </FF>
            <FF label="Status">
              <Controller name="status" control={control} render={({ field }) => (
                <div className="relative">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={`${selectCls} pl-8`}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_META[s]?.label || s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none" style={{ background: statusMeta.color }} />
                </div>
              )} />
            </FF>
            <FF label="Vendor / Supplier" span2>
              <Controller name="vendor" control={control} render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="— No Vendor —" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="none">— No Vendor —</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>

            <Divider icon={StickyNote} label="Notes" />
            <FF label="Internal Notes" span2>
              <Textarea {...register('notes')} rows={3} placeholder="Observations, special requirements, history…" className={textareaCls} />
            </FF>
          </div>

          {!editing && (
            <div className="mt-5 rounded-md overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              <button type="button" onClick={() => setAddCal(v => !v)} className="w-full flex items-center justify-between px-4 py-3 transition-colors" style={{ background: addCal ? 'color-mix(in srgb,var(--blue) 6%,transparent)' : 'var(--bg-3)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: addCal ? 'var(--blue)' : 'var(--tx-2)' }}>
                  <CalendarCheck size={14} color={addCal ? 'var(--blue)' : 'var(--tx-3)'} />
                  Add Initial Calibration Record
                  <span className="text-[0.6875rem] font-normal text-[var(--tx-3)] italic">optional</span>
                </span>
                {addCal ? <ChevronUp size={14} color="var(--blue)" /> : <ChevronDown size={14} color="var(--tx-3)" />}
              </button>
              {addCal && (
                <div className="grid-form p-4 gap-3" style={{ background: 'color-mix(in srgb,var(--blue) 3%,var(--bg-3))', borderTop: '1px solid var(--line)' }}>
                  <FF label="Calibration Date *">
                    <Input type="date" value={calForm.calibration_date} onChange={setCal('calibration_date')} className={inputCls} />
                  </FF>
                  <FF label="Next Due Date *">
                    <Input type="date" value={calForm.next_due_date} onChange={setCal('next_due_date')} className={inputCls} />
                  </FF>
                  <FF label="Calibrated By Vendor" span2>
                    <Select value={calForm.calibrated_by_vendor || 'none'} onValueChange={v => setCalForm(f => ({ ...f, calibrated_by_vendor: v === 'none' ? '' : v }))}>
                      <SelectTrigger className={selectCls}><SelectValue placeholder="— Internal / Not specified —" /></SelectTrigger>
                      <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                        <SelectItem value="none">— Internal / Not specified —</SelectItem>
                        {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FF>
                  <FF label="Calibration Notes" span2>
                    <Input value={calForm.notes} onChange={setCal('notes')} placeholder="Certificate number, lab, observations…" className={inputCls} />
                  </FF>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 mt-5 pb-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <FlaskConical size={13} />}
              {editing ? 'Save Changes' : 'Add Instrument'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Instruments() {
  const { user }   = useAuth();
  const toast      = useToast();
  const qc         = useQueryClient();
  const isAdmin    = user?.role === 'manager';
  const navigate   = useNavigate();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing,    setImporting]    = useState(false);
  const importRef = useRef();

  const { data: instruments = [], isLoading } = useInstruments();
  const { data: vendors     = [] }            = useVendors();

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.instruments });

  const handleExport = async () => {
    try {
      const res = await api.get('instruments/export/', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `instruments_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      invalidate();
    } catch { toast('Import failed. Check file format.', 'error'); }
    finally { setImporting(false); if (importRef.current) importRef.current.value = ''; }
  };

  const handleDelete = async () => {
    try { await api.delete(`instruments/${deleteTarget.id}/`); toast('Instrument deleted.', 'success'); setDeleteTarget(null); invalidate(); }
    catch { toast('Failed to delete instrument.', 'error'); }
  };

  const filtered = instruments.filter(inst => {
    const q = search.toLowerCase();
    const matchSearch = !q || inst.name?.toLowerCase().includes(q) || inst.serial_number?.toLowerCase().includes(q) || inst.model?.toLowerCase().includes(q) || inst.location?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <div className="shimmer-box" style={{ width: 200, height: 32, borderRadius: 'var(--r-md)' }} />
        <div className="shimmer-box" style={{ width: 120, height: 32, borderRadius: 'var(--r-md)' }} />
      </div>
      <div className="shimmer-box" style={{ height: 320, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Instruments</h1>
          <p className="t-body mt-0.5">{instruments.length} instruments in laboratory</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport} className="border-[var(--line-2)] text-[var(--tx-2)]">
              <Download size={13} />Export Excel
            </Button>
            <Button variant="outline" onClick={() => importRef.current?.click()} disabled={importing} className="border-[var(--line-2)] text-[var(--tx-2)]">
              {importing ? <span className="w-3.5 h-3.5 border-2 border-[var(--line-2)] border-t-[var(--tx-2)] rounded-full animate-spin" /> : <Upload size={13} />}
              Import Excel
            </Button>
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button onClick={() => setModal({ mode: 'add' })} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              <Plus size={13} />Add Instrument
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, serial, model, location…"
            className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_META[s]?.label || s}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <div className="surface overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Serial Number</th><th>Model</th><th>Location</th><th>Status</th><th>Vendor</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id} className="cursor-pointer group">
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>
                      <div className="flex items-center gap-2">
                        <div className="w-[30px] h-[30px] rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--blue) 12%,transparent)' }}>
                          <FlaskConical size={14} color="var(--blue)" />
                        </div>
                        <span className="font-medium">{inst.name}</span>
                      </div>
                    </td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)} className="font-mono t-small text-[var(--tx-2)]">{inst.serial_number}</td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>{inst.model}</td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>
                      <span className="flex items-center gap-1"><MapPin size={11} color="var(--tx-3)" />{inst.location}</span>
                    </td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}><StatusBadge status={inst.status} /></td>
                    <td onClick={() => navigate(`/instruments/${inst.id}`)}>{inst.vendor_name || '—'}</td>
                    <td>
                      {isAdmin && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setModal({ mode: 'edit', instrument: inst }); }} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]" title="Edit"><Pencil size={12} /></Button>
                          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); setDeleteTarget(inst); }} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 size={12} /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <InstrumentModal instrument={modal.mode === 'edit' ? modal.instrument : null} vendors={vendors} onClose={() => setModal(null)} onSuccess={invalidate} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Instrument"
          message={`Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.serial_number})? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
