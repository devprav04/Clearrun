import { useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Search,
  Phone, Mail, Star, Package, FileText,
  CreditCard, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useVendors, QK } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const SERVICE_TYPES = [
  { value: 'calibration',  label: 'Calibration'         },
  { value: 'amc',          label: 'AMC / Maintenance'    },
  { value: 'supply',       label: 'Parts Supply'         },
  { value: 'repair',       label: 'Repair & Service'     },
  { value: 'installation', label: 'Installation'         },
  { value: 'multiple',     label: 'Multiple Services'    },
];

const SERVICE_BADGE_COLOR = {
  calibration:  'var(--purple)',
  amc:          'var(--blue)',
  supply:       'var(--green)',
  repair:       'var(--orange)',
  installation: 'var(--yellow)',
  multiple:     'var(--tx-3)',
};

const inputCls    = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const selectCls   = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';
const textareaCls = 'bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)] resize-none';

function SectionBlock({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3.5 py-2.5" style={{ background: 'var(--bg-3)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div className="flex items-center gap-2">
          <Icon size={13} color="var(--blue)" />
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tx-2)' }}>{title}</span>
        </div>
        {open ? <ChevronDown size={13} color="var(--tx-3)" /> : <ChevronRight size={13} color="var(--tx-3)" />}
      </button>
      {open && <div className="grid-form p-3.5 gap-3" style={{ background: 'var(--bg-3)' }}>{children}</div>}
    </div>
  );
}

function FF({ label, span2, children, error }) {
  return (
    <div style={span2 ? { gridColumn: 'span 2' } : {}}>
      <Label className="t-label mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(value === n ? null : n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Star size={18} style={{ color: n <= (value || 0) ? '#f59e0b' : 'var(--line-2)', fill: n <= (value || 0) ? '#f59e0b' : 'none', transition: 'color .1s' }} />
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange(null)} className="t-small" style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', marginLeft: 4 }}>clear</button>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
      background: checked ? 'var(--brand)' : 'var(--line-2)', transition: 'background .15s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        left: checked ? 21 : 3, transition: 'left .15s',
      }} />
    </button>
  );
}

const vendorSchema = z.object({
  name:            z.string().min(1, 'Vendor name is required'),
  contact_person:  z.string().optional(),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  phone:           z.string().optional(),
  alternate_phone: z.string().optional(),
  address:         z.string().optional(),
  website:         z.string().optional(),
  service_type:    z.string().optional(),
  gstin:           z.string().optional(),
  pan:             z.string().optional(),
  payment_terms:   z.string().optional(),
  bank_name:       z.string().optional(),
  bank_account:    z.string().optional(),
  bank_ifsc:       z.string().optional(),
  is_active:       z.boolean().default(true),
  rating:          z.number().nullable().optional(),
  notes:           z.string().optional(),
});

function VendorModal({ vendor, onClose, onSuccess }) {
  const editing = Boolean(vendor);
  const toast   = useToast();

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name:            vendor?.name            || '',
      contact_person:  vendor?.contact_person  || '',
      email:           vendor?.email           || '',
      phone:           vendor?.phone           || '',
      alternate_phone: vendor?.alternate_phone || '',
      address:         vendor?.address         || '',
      website:         vendor?.website         || '',
      service_type:    vendor?.service_type    || '',
      gstin:           vendor?.gstin           || '',
      pan:             vendor?.pan             || '',
      payment_terms:   vendor?.payment_terms   || '',
      bank_name:       vendor?.bank_name       || '',
      bank_account:    vendor?.bank_account    || '',
      bank_ifsc:       vendor?.bank_ifsc       || '',
      is_active:       vendor?.is_active ?? true,
      rating:          vendor?.rating          || null,
      notes:           vendor?.notes           || '',
    },
  });

  const isActive = watch('is_active');
  const rating   = watch('rating');

  const onSave = async (data) => {
    try {
      const payload = { ...data, rating: data.rating || null };
      if (editing) await api.patch(`vendors/${vendor.id}/`, payload);
      else         await api.post('vendors/', payload);
      toast(editing ? 'Vendor updated.' : 'Vendor added.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to save vendor.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[640px] bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[var(--line)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--blue) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--blue) 25%,transparent)' }}>
              <Building2 size={15} color="var(--blue)" />
            </div>
            <DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3.5 overflow-y-auto px-6 py-4">
          <SectionBlock title="Contact Information" icon={Phone}>
            <FF label="Vendor / Company Name *" span2 error={errors.name?.message}>
              <Input {...register('name')} placeholder="e.g. ABC Instruments Pvt Ltd" className={inputCls} />
            </FF>
            <FF label="Contact Person">
              <Input {...register('contact_person')} placeholder="e.g. Ramesh Kumar" className={inputCls} />
            </FF>
            <FF label="Phone">
              <Input {...register('phone')} type="tel" placeholder="+91 98000 00000" className={inputCls} />
            </FF>
            <FF label="Alternate Phone">
              <Input {...register('alternate_phone')} type="tel" placeholder="Optional" className={inputCls} />
            </FF>
            <FF label="Email" error={errors.email?.message}>
              <Input {...register('email')} type="email" placeholder="info@vendor.com" className={inputCls} />
            </FF>
            <FF label="Website" span2>
              <Input {...register('website')} type="url" placeholder="https://vendor.com" className={inputCls} />
            </FF>
            <FF label="Address" span2>
              <Textarea {...register('address')} rows={2} placeholder="Full address…" className={textareaCls} />
            </FF>
          </SectionBlock>

          <SectionBlock title="Service Details" icon={Package}>
            <FF label="Service Type">
              <Controller name="service_type" control={control} render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Select service type…" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="none">Select service type…</SelectItem>
                    {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Vendor Rating">
              <StarRating value={rating} onChange={v => setValue('rating', v)} />
            </FF>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <div>
                <p className="text-sm font-medium text-[var(--tx-1)]">Active Vendor</p>
                <p className="t-small">Inactive vendors won't appear in selectors</p>
              </div>
              <Toggle checked={isActive} onChange={v => setValue('is_active', v)} />
            </div>
          </SectionBlock>

          <SectionBlock title="Business / Tax Details" icon={FileText} defaultOpen={false}>
            <FF label="GSTIN / Tax ID">
              <Input {...register('gstin')} placeholder="22AAAAA0000A1Z5" className={inputCls} />
            </FF>
            <FF label="PAN">
              <Input {...register('pan')} placeholder="AAAAA9999A" className={inputCls} />
            </FF>
            <FF label="Payment Terms" span2>
              <Input {...register('payment_terms')} placeholder="e.g. Net 30, 50% advance + 50% on delivery" className={inputCls} />
            </FF>
          </SectionBlock>

          <SectionBlock title="Bank Details" icon={CreditCard} defaultOpen={false}>
            <FF label="Bank Name">
              <Input {...register('bank_name')} placeholder="e.g. HDFC Bank" className={inputCls} />
            </FF>
            <FF label="Account Number">
              <Input {...register('bank_account')} placeholder="Account number" className={inputCls} />
            </FF>
            <FF label="IFSC / Swift Code">
              <Input {...register('bank_ifsc')} placeholder="e.g. HDFC0001234" className={inputCls} />
            </FF>
          </SectionBlock>

          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Internal Notes</Label>
            <Textarea {...register('notes')} rows={3} placeholder="Any internal notes about this vendor…" className={textareaCls} />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-1 pb-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VendorDetail({ vendor, onClose, onEdit }) {
  const rating = vendor.rating || 0;

  const Row = ({ label, value }) => value ? (
    <div className="flex gap-3 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
      <p className="t-small flex-shrink-0 font-semibold uppercase tracking-wide text-[var(--tx-3)]" style={{ width: 110 }}>{label}</p>
      <p className="text-sm text-[var(--tx-1)] flex-1">{value}</p>
    </div>
  ) : null;

  const badgeColor = SERVICE_BADGE_COLOR[vendor.service_type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="h-full w-full max-w-[400px] overflow-y-auto" style={{ background: 'var(--bg-2)', borderLeft: '1px solid var(--line)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
              {vendor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="t-title">{vendor.name}</p>
              {vendor.service_type && badgeColor && (
                <span className="inline-flex mt-1.5 px-2 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-wide" style={{ color: badgeColor, background: `color-mix(in srgb,${badgeColor} 10%,transparent)`, border: `1px solid color-mix(in srgb,${badgeColor} 25%,transparent)` }}>
                  {vendor.service_type_display || vendor.service_type}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="grid-3 gap-2.5">
            {[
              { label: 'Instruments', value: vendor.instruments_count ?? '—' },
              { label: 'Active AMC',  value: vendor.active_amc_count  ?? '—' },
              { label: 'Rating',      value: rating ? `${rating}/5 ★`  : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="py-3 text-center rounded-md" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                <p className="text-xl font-bold text-[var(--tx-1)]">{value}</p>
                <p className="t-small mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md px-3 py-2.5" style={{ background: vendor.is_active ? 'color-mix(in srgb,var(--green) 8%,transparent)' : 'var(--bg-3)', border: `1px solid ${vendor.is_active ? 'color-mix(in srgb,var(--green) 25%,transparent)' : 'var(--line)'}` }}>
            <span className="t-small">Vendor Status</span>
            <span className="text-[0.8125rem] font-semibold" style={{ color: vendor.is_active ? 'var(--green)' : 'var(--tx-3)' }}>
              {vendor.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div>
            <p className="t-label mb-2">Contact Information</p>
            <div className="rounded-md overflow-hidden px-3" style={{ border: '1px solid var(--line)' }}>
              <Row label="Contact"   value={vendor.contact_person} />
              <Row label="Phone"     value={vendor.phone}          />
              <Row label="Alt. Phone" value={vendor.alternate_phone} />
              <Row label="Email"     value={vendor.email}          />
              <Row label="Website"   value={vendor.website}        />
              <Row label="Address"   value={vendor.address}        />
            </div>
          </div>

          {(vendor.gstin || vendor.pan || vendor.payment_terms) && (
            <div>
              <p className="t-label mb-2">Business Details</p>
              <div className="rounded-md overflow-hidden px-3" style={{ border: '1px solid var(--line)' }}>
                <Row label="GSTIN"   value={vendor.gstin}         />
                <Row label="PAN"     value={vendor.pan}           />
                <Row label="Payment" value={vendor.payment_terms} />
              </div>
            </div>
          )}

          {(vendor.bank_name || vendor.bank_account) && (
            <div>
              <p className="t-label mb-2">Bank Details</p>
              <div className="rounded-md overflow-hidden px-3" style={{ border: '1px solid var(--line)' }}>
                <Row label="Bank"    value={vendor.bank_name}    />
                <Row label="Account" value={vendor.bank_account} />
                <Row label="IFSC"    value={vendor.bank_ifsc}    />
              </div>
            </div>
          )}

          {vendor.notes && (
            <div className="rounded-md px-3.5 py-3" style={{ background: 'color-mix(in srgb,var(--yellow) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--yellow) 20%,transparent)' }}>
              <p className="t-label mb-1.5">Notes</p>
              <p className="text-sm text-[var(--tx-2)]">{vendor.notes}</p>
            </div>
          )}

          <Button variant="outline" onClick={() => { onClose(); onEdit(vendor); }} className="w-full border-[var(--line-2)] text-[var(--tx-2)]">
            <Pencil size={13} /> Edit Vendor
          </Button>
        </div>
      </div>
    </div>
  );
}

function ServiceBadge({ type, display }) {
  const color = SERVICE_BADGE_COLOR[type] || 'var(--tx-3)';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-wide" style={{ color, background: `color-mix(in srgb,${color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${color} 20%,transparent)` }}>
      {display || type}
    </span>
  );
}

export default function Vendors() {
  const { user } = useAuth();
  const toast    = useToast();
  const qc       = useQueryClient();
  const isAdmin  = user?.role === 'manager' || user?.role === 'admin' || user?.is_superuser;

  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');
  const [modalVendor,  setModalVendor]  = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [detailVendor, setDetailVendor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: vendors = [], isLoading: loading } = useVendors();

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.vendors });

  const handleDelete = async () => {
    try { await api.delete(`vendors/${deleteTarget.id}/`); toast('Vendor deleted.', 'success'); setDeleteTarget(null); invalidate(); }
    catch { toast('Delete failed.', 'error'); }
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || (v.contact_person || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
    const matchType   = filterType === 'all' || v.service_type === filterType;
    return matchSearch && matchType;
  });

  const activeCount = vendors.filter(v => v.is_active).length;

  return (
    <div className="flex flex-col gap-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Vendors</h1>
          <p className="t-body mt-0.5">{vendors.length} vendors · <span className="font-semibold" style={{ color: 'var(--green)' }}>{activeCount} active</span></p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setModalVendor(null); setShowModal(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            <Plus size={13} />Add Vendor
          </Button>
        )}
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…"
            className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] pl-8" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-auto min-w-[160px] bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
            <SelectItem value="all">All service types</SelectItem>
            {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="surface flex items-center justify-center" style={{ height: 240 }}>
          <span className="w-5 h-5 border-2 border-[var(--line-2)] border-t-[var(--tx-2)] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface">
          <div className="empty-state">
            <div className="empty-state-icon"><Building2 size={22} color="var(--tx-3)" /></div>
            <p className="t-body">{isAdmin ? 'No vendors found. Add your first vendor.' : 'No vendors added yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th><th>Service Type</th><th>Contact</th><th>Phone / Email</th>
                  <th>Instruments</th><th>Active AMC</th><th>Rating</th><th>Status</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="cursor-pointer" onClick={() => setDetailVendor(v)}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--tx-1)]">{v.name}</p>
                          {v.gstin && <p className="t-mono t-small">{v.gstin}</p>}
                        </div>
                      </div>
                    </td>
                    <td>{v.service_type ? <ServiceBadge type={v.service_type} display={v.service_type_display} /> : <span className="t-small">—</span>}</td>
                    <td className="t-body">{v.contact_person || '—'}</td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        {v.phone && <p className="t-small flex items-center gap-1"><Phone size={11} color="var(--tx-3)" />{v.phone}</p>}
                        {v.email && <p className="t-small flex items-center gap-1"><Mail size={11} color="var(--tx-3)" />{v.email}</p>}
                        {!v.phone && !v.email && <span className="t-small">—</span>}
                      </div>
                    </td>
                    <td><span className="text-sm font-semibold text-[var(--tx-1)]">{v.instruments_count ?? 0}</span></td>
                    <td><span className="text-sm font-semibold" style={{ color: v.active_amc_count > 0 ? 'var(--green)' : 'var(--tx-3)' }}>{v.active_amc_count ?? 0}</span></td>
                    <td>
                      {v.rating ? (
                        <span className="flex items-center gap-1 text-sm" style={{ color: '#f59e0b' }}>
                          <Star size={13} style={{ fill: '#f59e0b' }} />{v.rating}
                        </span>
                      ) : <span className="t-small">—</span>}
                    </td>
                    <td>
                      <span className="inline-flex px-2 py-0.5 rounded text-[0.6875rem] font-semibold uppercase tracking-wide" style={{ color: v.is_active ? 'var(--green)' : 'var(--tx-3)', background: v.is_active ? 'color-mix(in srgb,var(--green) 10%,transparent)' : 'var(--bg-3)', border: `1px solid ${v.is_active ? 'color-mix(in srgb,var(--green) 25%,transparent)' : 'var(--line)'}` }}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => { setModalVendor(v); setShowModal(true); }} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]" title="Edit"><Pencil size={12} /></Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(v)} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 size={12} /></Button>
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

      {showModal && <VendorModal vendor={modalVendor} onClose={() => { setShowModal(false); setModalVendor(null); }} onSuccess={invalidate} />}
      {detailVendor && <VendorDetail vendor={detailVendor} onClose={() => setDetailVendor(null)} onEdit={v => { setModalVendor(v); setShowModal(true); }} />}
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
