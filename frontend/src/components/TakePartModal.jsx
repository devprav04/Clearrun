import { useState, useEffect, useCallback } from 'react';
import { Package, X, Search } from 'lucide-react';
import api from '../api/axios';
import { useToast } from './Toast';

export default function TakePartModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');

  useEffect(() => {
    api.get('inventory/parts/').then((r) => setParts(r.data?.results || r.data || []));
  }, []);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const filtered = parts.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await api.post('inventory/transactions/', {
        part: selected.id, transaction_type: 'out',
        quantity: Number(qty), notes: reason || 'Taken by employee',
      });
      toast(`${qty} × ${selected.name} checked out.`, 'success');
      onSuccess?.(); onClose();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed — check stock availability.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--blue) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--blue) 25%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={15} color="var(--blue)" />
            </div>
            <span className="t-title">Take Spare Part</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {step === 'select' ? (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input autoFocus placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)}
                className="input" style={{ paddingLeft: 32 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
              {filtered.length === 0
                ? <p className="t-body" style={{ textAlign: 'center', padding: '32px 0' }}>No parts found</p>
                : filtered.map((p) => {
                  const inStock = p.quantity_in_stock > 0;
                  const isSelected = selected?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => inStock && setSelected(p)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 'var(--r-md)',
                      border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--line)'}`,
                      background: isSelected ? 'color-mix(in srgb,var(--blue) 8%,transparent)' : 'var(--bg-3)',
                      cursor: inStock ? 'pointer' : 'not-allowed', opacity: inStock ? 1 : .4,
                      transition: 'all .1s',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{p.name}</p>
                        <p className="t-mono t-small">{p.part_number}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: p.quantity_in_stock <= (p.minimum_stock_level || 0) ? 'var(--orange)' : 'var(--green)' }}>
                          {p.quantity_in_stock} in stock
                        </p>
                        {!inStock && <p style={{ fontSize: '0.72rem', color: 'var(--red)' }}>Out of stock</p>}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => selected && setStep('confirm')} disabled={!selected} className="btn btn-primary" style={{ flex: 1 }}>
                Next →
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '14px 16px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
              <p className="t-label" style={{ marginBottom: 4 }}>Selected Part</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx-1)' }}>{selected.name}</p>
              <p className="t-small t-mono">{selected.part_number} · {selected.quantity_in_stock} available</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              <div>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Quantity *</label>
                <input type="number" min="1" max={selected.quantity_in_stock} required value={qty}
                  onChange={e => setQty(e.target.value)} className="input" />
              </div>
              <div>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Reason / Reference</label>
                <input placeholder="e.g. Replaced detector lamp on GC-001" value={reason}
                  onChange={e => setReason(e.target.value)} className="input" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('select')} className="btn btn-ghost" style={{ flex: 1 }}>← Back</button>
              <button onClick={handleConfirm} disabled={loading || qty < 1} className="btn btn-primary" style={{ flex: 1 }}>
                {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
                Confirm Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
