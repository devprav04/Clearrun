import { useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowDownToLine, ArrowUpFromLine, Search, Pencil, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { useParts, useVendors, QK } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const partSchema = z.object({
  name:                 z.string().min(1, 'Required'),
  part_number:          z.string().min(1, 'Required'),
  unit_cost:            z.coerce.number().min(0),
  quantity_in_stock:    z.coerce.number().int().min(0).default(0),
  minimum_stock_level:  z.coerce.number().int().min(0).default(2),
  location:             z.string().optional(),
  vendor:               z.string().optional(),
  description:          z.string().optional(),
});

const inputCls  = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const selectCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';

function StockModal({ part, onClose, onSuccess }) {
  const toast = useToast();
  const [txType,  setTxType]  = useState('in');
  const [qty,     setQty]     = useState(1);
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('inventory/transactions/', { part: part.id, transaction_type: txType, quantity: Number(qty), notes });
      toast(txType === 'out' ? `${qty} unit(s) checked out.` : `${qty} unit(s) added to stock.`, 'success');
      onSuccess(); onClose();
    } catch { toast('Failed to record transaction.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md bg-[var(--bg-2)] border-[var(--line-2)]">
        <DialogHeader><DialogTitle className="text-[var(--tx-1)]">Stock Transaction</DialogTitle></DialogHeader>
        <div className="rounded-md px-3.5 py-2.5" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
          <p className="t-small">Part</p>
          <p className="text-sm font-semibold text-[var(--tx-1)] mt-0.5">{part.name}</p>
          <p className="t-small mt-0.5">Current stock: <span className="font-bold text-[var(--blue)]">{part.quantity_in_stock}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Transaction Type</Label>
            <div className="flex gap-2">
              {[
                { val: 'in',  icon: ArrowDownToLine, label: 'Stock In',  color: 'var(--green)' },
                { val: 'out', icon: ArrowUpFromLine,  label: 'Stock Out', color: 'var(--red)'   },
              ].map(({ val, icon: Icon, label, color }) => {
                const active = txType === val;
                return (
                  <button key={val} type="button" onClick={() => setTxType(val)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-all" style={{ border: `1px solid ${active ? color : 'var(--line)'}`, background: active ? `color-mix(in srgb,${color} 10%,transparent)` : 'var(--bg-3)', color: active ? color : 'var(--tx-2)', cursor: 'pointer' }}>
                    <Icon size={14} />{label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Quantity</Label>
            <Input type="number" min="1" required value={qty} onChange={e => setQty(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason / reference…" className={inputCls} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PartModal({ part, onClose, onSuccess }) {
  const editing = Boolean(part);
  const toast   = useToast();
  const { data: vendors = [] } = useVendors();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name:                part?.name                || '',
      part_number:         part?.part_number         || '',
      unit_cost:           part?.unit_cost           || '',
      quantity_in_stock:   part?.quantity_in_stock   ?? 0,
      minimum_stock_level: part?.minimum_stock_level ?? 2,
      location:            part?.location            || '',
      vendor:              String(part?.vendor       || ''),
      description:         part?.description         || '',
    },
  });

  const onSave = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.vendor) delete payload.vendor;
      if (editing) await api.patch(`inventory/parts/${part.id}/`, payload);
      else         await api.post('inventory/parts/', payload);
      toast(editing ? 'Part updated.' : 'Part added.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save part.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package size={16} color="var(--tx-2)" />
            <DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Spare Part' : 'Add Spare Part'}</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <div className="grid-form">
            {[
              { key: 'name',                label: 'Part Name *',     placeholder: 'e.g. Detector Lamp' },
              { key: 'part_number',         label: 'Part Number *',   placeholder: 'e.g. G7167-60120'   },
              { key: 'unit_cost',           label: 'Unit Cost (₹) *', placeholder: '0.00', type: 'number' },
              { key: 'location',            label: 'Storage Location',placeholder: 'Cabinet B-3'         },
              { key: 'quantity_in_stock',   label: 'Qty in Stock',    type: 'number'                     },
              { key: 'minimum_stock_level', label: 'Min. Stock Level',type: 'number'                     },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label className="t-label">{label}</Label>
                <Input {...register(key)} type={type || 'text'} placeholder={placeholder} className={inputCls} />
                {errors[key] && <p className="text-xs text-destructive">{errors[key].message}</p>}
              </div>
            ))}
            <div className="flex flex-col gap-1.5" style={{ gridColumn: 'span 2' }}>
              <Label className="t-label">Vendor</Label>
              <Controller name="vendor" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="— No Vendor —" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="">— No Vendor —</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Description</Label>
            <Textarea {...register('description')} rows={2} placeholder="Optional description…" className={`${inputCls} h-auto`} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Add Part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventory() {
  const { user }  = useAuth();
  const toast     = useToast();
  const qc        = useQueryClient();
  const isAdmin   = user?.role === 'manager';

  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [stockModal,   setStockModal]   = useState(null);
  const [partModal,    setPartModal]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: parts = [], isLoading } = useParts();

  const invalidate = () => qc.invalidateQueries({ queryKey: QK.parts });

  const handleDelete = async () => {
    try {
      await api.delete(`inventory/parts/${deleteTarget.id}/`);
      toast('Part deleted.', 'success');
      setDeleteTarget(null);
      invalidate();
    } catch { toast('Failed to delete part.', 'error'); }
  };

  const filtered = parts.filter(p => {
    const q    = search.toLowerCase();
    const hit  = !q || p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q);
    const isLo = p.quantity_in_stock <= p.minimum_stock_level;
    return hit && (filter === 'all' || (filter === 'low' && isLo));
  });

  const lowCount = parts.filter(p => p.quantity_in_stock <= p.minimum_stock_level).length;

  if (isLoading) return (
    <div className="flex flex-col gap-4">
      <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer-box" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />)}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Spare Parts Inventory</h1>
          <p className="t-body mt-0.5">{parts.length} parts tracked</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {lowCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: 'color-mix(in srgb,var(--orange) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--orange) 25%,transparent)' }}>
              <AlertTriangle size={13} color="var(--orange)" />
              <span className="text-sm font-medium" style={{ color: 'var(--orange)' }}>{lowCount} low stock</span>
            </div>
          )}
          {isAdmin && (
            <Button onClick={() => setPartModal({ mode: 'add' })} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              <Plus size={13} />Add Part
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input placeholder="Search by name or part number…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
        <div className="flex gap-1.5">
          {[['all', 'All Parts'], ['low', 'Low Stock']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} className="px-4 h-9 rounded-md text-sm font-medium transition-all" style={{ border: `1px solid ${filter === val ? 'var(--tx-2)' : 'var(--line-2)'}`, background: filter === val ? 'var(--tx-1)' : 'var(--bg-2)', color: filter === val ? 'var(--bg)' : 'var(--tx-2)', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface"><div className="empty-state"><div className="empty-state-icon"><Package size={22} color="var(--tx-3)" /></div><p className="t-body">No parts found</p></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {filtered.map(part => {
            const isLow    = part.quantity_in_stock <= (part.minimum_stock_level || 0);
            const stockPct = part.minimum_stock_level ? Math.min(100, (part.quantity_in_stock / (part.minimum_stock_level * 3)) * 100) : 100;
            return (
              <div key={part.id} className="surface flex flex-col gap-3" style={{ padding: 16, borderColor: isLow ? 'color-mix(in srgb,var(--orange) 40%,transparent)' : undefined }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-medium text-[var(--tx-1)] leading-snug">{part.name}</p>
                    <p className="t-mono t-small mt-0.5">{part.part_number}</p>
                  </div>
                  {isLow && <AlertTriangle size={14} color="var(--orange)" className="flex-shrink-0 mt-0.5" />}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="t-small">Stock</span>
                    <span className="text-sm font-bold" style={{ color: isLow ? 'var(--orange)' : 'var(--tx-1)' }}>
                      {part.quantity_in_stock}<span className="t-small font-normal"> / min {part.minimum_stock_level || 0}</span>
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
                    <div style={{ width: `${stockPct}%`, height: '100%', borderRadius: 99, background: isLow ? 'var(--orange)' : 'var(--green)' }} />
                  </div>
                </div>
                {part.unit_cost && <p className="t-small">Unit Cost: <span className="text-[var(--tx-2)]">₹{Number(part.unit_cost).toLocaleString('en-IN')}</span></p>}
                {part.location  && <p className="t-small">📍 {part.location}</p>}
                <div className="flex gap-1.5 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
                  <Button variant="outline" size="sm" onClick={() => setStockModal(part)} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)] text-xs">
                    <Plus size={12} />Stock
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setPartModal({ mode: 'edit', part })} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]"><Pencil size={12} /></Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(part)} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10"><Trash2 size={12} /></Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stockModal && <StockModal part={stockModal} onClose={() => setStockModal(null)} onSuccess={invalidate} />}
      {partModal  && <PartModal  part={partModal.part} onClose={() => setPartModal(null)} onSuccess={invalidate} />}
      {deleteTarget && (
        <ConfirmDialog title="Delete Spare Part"
          message={`Delete "${deleteTarget.name}" (${deleteTarget.part_number})? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
