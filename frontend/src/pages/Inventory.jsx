import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowDownToLine, ArrowUpFromLine, Search, X, Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

/* ─── Stock Transaction Modal ───────────────────────────────────── */
function StockModal({ part, onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({ transaction_type: 'in', quantity: 1, notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('inventory/transactions/', { part: part.id, ...form, quantity: Number(form.quantity) });
      toast(form.transaction_type === 'out' ? `${form.quantity} unit(s) checked out.` : `${form.quantity} unit(s) added to stock.`, 'success');
      onSuccess(); onClose();
    } catch { toast('Failed to record transaction.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="t-title">Stock Transaction</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
          <p className="t-small">Part</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tx-1)', marginTop: 2 }}>{part.name}</p>
          <p className="t-small" style={{ marginTop: 1 }}>Current stock: <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{part.quantity_in_stock}</span></p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Transaction Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'in',  icon: ArrowDownToLine,  label: 'Stock In',  color: 'var(--green)' },
                { val: 'out', icon: ArrowUpFromLine,   label: 'Stock Out', color: 'var(--red)'   },
              ].map(({ val, icon: Icon, label, color }) => {
                const active = form.transaction_type === val;
                return (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, transaction_type: val }))} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px', borderRadius: 'var(--r-md)', border: `1px solid ${active ? color : 'var(--line)'}`,
                    background: active ? `color-mix(in srgb,${color} 10%,transparent)` : 'var(--bg-3)',
                    color: active ? color : 'var(--tx-2)', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8125rem', fontWeight: 500, transition: 'all .12s',
                  }}>
                    <Icon size={14} />{label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Quantity</label>
            <input type="number" min="1" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="Reason / reference…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Part Modal ────────────────────────────────────────────────── */
function PartModal({ part, onClose, onSuccess }) {
  const editing = Boolean(part);
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    name: part?.name || '', part_number: part?.part_number || '',
    description: part?.description || '', unit_cost: part?.unit_cost || '',
    quantity_in_stock: part?.quantity_in_stock ?? 0, minimum_stock_level: part?.minimum_stock_level ?? 2,
    location: part?.location || '', vendor: part?.vendor || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('vendors/').then(r => setVendors(r.data?.results || r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.vendor) delete payload.vendor;
      if (editing) await api.patch(`inventory/parts/${part.id}/`, payload);
      else await api.post('inventory/parts/', payload);
      onSuccess(); onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save part.');
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 540, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={16} color="var(--tx-2)" />
            <span className="t-title">{editing ? 'Edit Spare Part' : 'Add Spare Part'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        {error && (
          <div style={{ padding: '10px 12px', background: 'color-mix(in srgb,var(--red) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-form">
            {[
              { key: 'name', label: 'Part Name *', placeholder: 'e.g. Detector Lamp', required: true },
              { key: 'part_number', label: 'Part Number *', placeholder: 'e.g. G7167-60120', required: true },
              { key: 'unit_cost', label: 'Unit Cost (₹) *', placeholder: '0.00', type: 'number', required: true },
              { key: 'location', label: 'Storage Location', placeholder: 'e.g. Cabinet B-3' },
              { key: 'quantity_in_stock', label: 'Qty in Stock', type: 'number' },
              { key: 'minimum_stock_level', label: 'Min. Stock Level', type: 'number' },
            ].map(({ key, label, placeholder, type, required }) => (
              <div key={key}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
                <input type={type || 'text'} required={required} placeholder={placeholder} value={form[key]} onChange={set(key)} className="input"
                  min={type === 'number' ? 0 : undefined} step={key === 'unit_cost' ? '0.01' : undefined} />
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Vendor</label>
              <select value={form.vendor} onChange={set('vendor')} className="input">
                <option value="">— No Vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className="input" placeholder="Optional description…" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" />}
              {editing ? 'Save Changes' : 'Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */
export default function Inventory() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'manager';
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stockModal, setStockModal] = useState(null);
  const [partModal, setPartModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchParts = async () => {
    setLoading(true);
    try { const r = await api.get('inventory/parts/'); setParts(r.data?.results || r.data || []); }
    catch (_) { /* errors surface via empty state */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParts(); }, []);

  const handleDelete = async () => {
    try { await api.delete(`inventory/parts/${deleteTarget.id}/`); toast('Part deleted.', 'success'); setDeleteTarget(null); fetchParts(); }
    catch { toast('Failed to delete part.', 'error'); }
  };

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.part_number?.toLowerCase().includes(q);
    const isLow = p.quantity_in_stock <= p.minimum_stock_level;
    const matchFilter = filter === 'all' || (filter === 'low' && isLow);
    return matchSearch && matchFilter;
  });

  const lowCount = parts.filter(p => p.quantity_in_stock <= p.minimum_stock_level).length;

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid-4">
        {[...Array(4)].map((_, i) => <div key={i} className="shimmer-box" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">Spare Parts Inventory</h1>
          <p className="t-body" style={{ marginTop: 2 }}>{parts.length} parts tracked</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lowCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'color-mix(in srgb,var(--orange) 8%,transparent)', border: '1px solid color-mix(in srgb,var(--orange) 25%,transparent)', borderRadius: 'var(--r-md)' }}>
              <AlertTriangle size={13} color="var(--orange)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--orange)' }}>{lowCount} low stock</span>
            </div>
          )}
          {isAdmin && <button onClick={() => setPartModal({ mode: 'add' })} className="btn btn-primary"><Plus size={13} />Add Part</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search by name or part number…" value={search} onChange={e => setSearch(e.target.value)}
            className="input" style={{ paddingLeft: 32 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All Parts'], ['low', 'Low Stock']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '0 16px', height: 36, borderRadius: 'var(--r-md)', border: `1px solid ${filter === val ? 'var(--tx-2)' : 'var(--line-2)'}`,
              background: filter === val ? 'var(--tx-1)' : 'var(--bg-2)', color: filter === val ? 'var(--bg)' : 'var(--tx-2)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 500, transition: 'all .12s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface" style={{ padding: '64px 0', textAlign: 'center' }}>
          <Package size={40} color="var(--tx-3)" style={{ margin: '0 auto 12px' }} />
          <p className="t-body">No parts found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {filtered.map(part => {
            const isLow = part.quantity_in_stock <= (part.minimum_stock_level || 0);
            const stockPct = part.minimum_stock_level ? Math.min(100, (part.quantity_in_stock / (part.minimum_stock_level * 3)) * 100) : 100;
            return (
              <div key={part.id} className="surface" style={{ padding: 16, borderColor: isLow ? 'color-mix(in srgb,var(--orange) 40%,transparent)' : undefined, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)', lineHeight: 1.3 }}>{part.name}</p>
                    <p className="t-mono t-small" style={{ marginTop: 2 }}>{part.part_number}</p>
                  </div>
                  {isLow && <AlertTriangle size={14} color="var(--orange)" style={{ flexShrink: 0, marginTop: 1 }} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="t-small">Stock</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isLow ? 'var(--orange)' : 'var(--tx-1)' }}>
                      {part.quantity_in_stock}<span className="t-small" style={{ fontWeight: 400 }}> / min {part.minimum_stock_level || 0}</span>
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${stockPct}%`, height: '100%', borderRadius: 99, background: isLow ? 'var(--orange)' : 'var(--green)', transition: 'width .3s' }} />
                  </div>
                </div>

                {part.unit_cost && <p className="t-small">Unit Cost: <span style={{ color: 'var(--tx-2)' }}>₹{Number(part.unit_cost).toLocaleString('en-IN')}</span></p>}
                {part.location  && <p className="t-small">📍 {part.location}</p>}

                <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  <button onClick={() => setStockModal(part)} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>
                    <Plus size={12} />Stock
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => setPartModal({ mode: 'edit', part })} className="btn btn-ghost btn-sm" style={{ padding: '0 10px' }} title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteTarget(part)} className="btn btn-danger btn-sm" style={{ padding: '0 10px' }} title="Delete"><Trash2 size={12} /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stockModal && <StockModal part={stockModal} onClose={() => setStockModal(null)} onSuccess={fetchParts} />}
      {partModal  && <PartModal part={partModal.part} onClose={() => setPartModal(null)} onSuccess={fetchParts} />}
      {deleteTarget && (
        <ConfirmDialog title="Delete Spare Part"
          message={`Delete "${deleteTarget.name}" (${deleteTarget.part_number})? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
