import { useState, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import api from '../api/axios';
import { useToast } from './Toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TakePartModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [parts, setParts]     = useState([]);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [qty, setQty]         = useState(1);
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState('select');

  useEffect(() => {
    api.get('inventory/parts/').then(r => setParts(r.data?.results || r.data || []));
  }, []);

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post('inventory/transactions/', { part: selected.id, transaction_type: 'out', quantity: Number(qty), notes: reason || 'Taken by employee' });
      toast(`${qty} × ${selected.name} checked out.`, 'success');
      onSuccess?.(); onClose();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed — check stock availability.', 'error');
    } finally { setLoading(false); }
  };

  const inputCls = 'bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[480px] bg-[var(--bg-2)] border-[var(--line-2)]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--blue) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--blue) 25%,transparent)' }}>
              <Package size={15} color="var(--blue)" />
            </div>
            <DialogTitle className="text-[var(--tx-1)]">Take Spare Part</DialogTitle>
          </div>
        </DialogHeader>

        {step === 'select' ? (
          <>
            <div className="relative">
              <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input autoFocus placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-8`} />
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {filtered.length === 0
                ? <p className="t-body text-center py-8">No parts found</p>
                : filtered.map(p => {
                  const inStock = p.quantity_in_stock > 0;
                  const isSel   = selected?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => inStock && setSelected(p)} className="flex items-center justify-between rounded-md px-3.5 py-2.5 transition-all" style={{ border: `1px solid ${isSel ? 'var(--blue)' : 'var(--line)'}`, background: isSel ? 'color-mix(in srgb,var(--blue) 8%,transparent)' : 'var(--bg-3)', cursor: inStock ? 'pointer' : 'not-allowed', opacity: inStock ? 1 : 0.4 }}>
                      <div>
                        <p className="text-sm font-medium text-[var(--tx-1)]">{p.name}</p>
                        <p className="t-mono t-small">{p.part_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{ color: p.quantity_in_stock <= (p.minimum_stock_level || 0) ? 'var(--orange)' : 'var(--green)' }}>
                          {p.quantity_in_stock} in stock
                        </p>
                        {!inStock && <p className="text-xs text-[var(--red)]">Out of stock</p>}
                      </div>
                    </div>
                  );
                })}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => selected && setStep('confirm')} disabled={!selected} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
                Next →
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-md px-4 py-3" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
              <p className="t-label mb-1">Selected Part</p>
              <p className="text-sm font-semibold text-[var(--tx-1)]">{selected.name}</p>
              <p className="t-small t-mono">{selected.part_number} · {selected.quantity_in_stock} available</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="t-label">Quantity *</Label>
                <Input type="number" min="1" max={selected.quantity_in_stock} required value={qty}
                  onChange={e => setQty(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="t-label">Reason / Reference</Label>
                <Input placeholder="e.g. Replaced detector lamp on GC-001" value={reason}
                  onChange={e => setReason(e.target.value)} className={inputCls} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">← Back</Button>
              <Button onClick={handleConfirm} disabled={loading || qty < 1} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
                {loading && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                Confirm Checkout
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
