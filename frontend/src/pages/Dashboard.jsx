import { useEffect, useState } from 'react';
import {
  CircleCheck, CircleX, CalendarClock, Activity,
  AlertOctagon, Banknote, Clock, ShieldCheck,
  Wrench, Package, X, AlertTriangle, Link2, Calendar,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import MaintenanceCalendar from '../components/MaintenanceCalendar';
import TakePartModal from '../components/TakePartModal';

/* ── Stat cards ────────────────────────────────────────────── */
const STAT_CARDS = [
  { key: 'operational',           label: 'Operational',  icon: CircleCheck,  bg: '#16a34a' },
  { key: 'calibrating',           label: 'Calibrating',  icon: Activity,     bg: '#d97706' },
  { key: 'broken_down',           label: 'Broken Down',  icon: CircleX,      bg: '#dc2626' },
  { key: 'scheduled_maintenance', label: 'Scheduled',    icon: CalendarClock,bg: '#2563eb' },
];

/* ── Breakdown modal ───────────────────────────────────────── */
function BreakdownModal({ onClose, onSubmit }) {
  const toast = useToast();
  const [instruments, setInstruments] = useState([]);
  const [form, setForm] = useState({ instrument: '', priority: 'medium', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('instruments/').then(r => setInstruments(r.data?.results || r.data || []));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('maintenance/tickets/', form);
      toast('Breakdown ticket submitted.', 'success');
      onSubmit(); onClose();
    } catch { toast('Failed to submit.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--red) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertOctagon size={15} color="var(--red)" />
            </div>
            <span className="t-title">Report Breakdown</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Instrument', content: <select required className="input" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}><option value="">Select instrument…</option>{instruments.map(i => <option key={i.id} value={i.id}>{i.name} — {i.serial_number}</option>)}</select> },
            { label: 'Priority', content: <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>{['low','medium','high','critical'].map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select> },
            { label: 'Description', content: <textarea required rows={3} className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue…" /> },
          ].map(({ label, content }) => (
            <div key={label}>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
              {content}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', height: 34, fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', opacity: loading ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />}
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [mgr, setMgr] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBD, setShowBD] = useState(false);
  const [showTP, setShowTP] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('reports/dashboard/');
      setDash(data);
      if (user?.role === 'manager') {
        const { data: m } = await api.get('reports/manager/');
        setMgr(m);
      }
      if (user?.role === 'technician') {
        const { data: t } = await api.get('maintenance/tickets/');
        setTickets((t?.results || t || []).filter(x => x.assigned_to === user.id));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const counts = dash?.instrument_status || dash || {};
  const isManager = user?.role === 'manager';
  const isTech    = user?.role === 'technician';

  /* ── Shimmer while loading ── */
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="shimmer-box" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />
        ))}
      </div>
      <div className="shimmer-box" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="t-heading">Good day, {user?.first_name || user?.username} 👋</h1>
          <p className="t-body" style={{ marginTop: 2 }}>
            Here's what's happening in your lab today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setShowTP(true)}>
            <Package size={13} /> Take Part
          </button>
          <button
            onClick={() => setShowBD(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 'var(--r-md)', background: 'var(--red)', color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <AlertOctagon size={13} /> Report Breakdown
          </button>
        </div>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, bg }) => (
          <div key={key} style={{
            background: bg, borderRadius: 'var(--r-lg)', padding: '18px 20px',
            position: 'relative', overflow: 'hidden',
            transition: 'transform .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,.10) 0%,transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>{label}</span>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'rgba(0,0,0,.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color="#fff" strokeWidth={2} />
              </div>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {counts[key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {dash?.low_stock_parts?.length > 0 && (
        <div style={{ background: 'color-mix(in srgb,var(--orange) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--orange) 20%,transparent)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid color-mix(in srgb,var(--orange) 15%,transparent)' }}>
            <AlertTriangle size={14} color="var(--orange)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--orange)' }}>Low Stock — {dash.low_stock_parts.length} part{dash.low_stock_parts.length > 1 ? 's' : ''} need restocking</span>
          </div>
          {dash.low_stock_parts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid color-mix(in srgb,var(--orange) 8%,transparent)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{p.name}</p>
                {p.part_number && <p className="t-mono t-small">{p.part_number}</p>}
                {p.instruments?.length > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--tx-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Link2 size={11} /> {p.instruments.join(', ')}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-orange">{p.quantity_in_stock} left</span>
                <p className="t-small" style={{ marginTop: 3 }}>min {p.minimum_stock_level}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {dash?.calibration_due_soon > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'color-mix(in srgb,var(--purple) 7%,transparent)', border: '1px solid color-mix(in srgb,var(--purple) 20%,transparent)', borderRadius: 'var(--r-lg)' }}>
          <Calendar size={14} color="var(--purple)" />
          <p style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>
            <span style={{ fontWeight: 700, color: 'var(--tx-1)' }}>{dash.calibration_due_soon}</span> calibration{dash.calibration_due_soon > 1 ? 's' : ''} due within 30 days
          </p>
        </div>
      )}

      {/* Manager KPIs */}
      {isManager && mgr && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { icon: Banknote,   label: 'AMC Value',        value: `₹${Number(mgr.active_amc_value || 0).toLocaleString('en-IN')}` },
            { icon: Clock,      label: 'Pending Renewals', value: mgr.amc_pending_renewals ?? '—' },
            { icon: ShieldCheck,label: 'Compliance',       value: `${mgr.compliance_percentage ?? '—'}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="surface" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="t-label">{label}</span>
                <Icon size={14} color="var(--tx-3)" strokeWidth={1.8} />
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--tx-1)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Technician work orders */}
      {isTech && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <span className="t-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={14} color="var(--tx-3)" /> My Work Orders</span>
            <span className="badge badge-blue">{tickets.length}</span>
          </div>
          {tickets.length === 0
            ? <p className="t-body" style={{ textAlign: 'center', padding: '40px 0' }}>No assigned tickets</p>
            : tickets.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{t.instrument_name || t.instrument}</p>
                  <p className="t-small">{t.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Maintenance calendar */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <Calendar size={14} color="var(--tx-3)" />
          <span className="t-title">Maintenance Calendar</span>
        </div>
        <div style={{ padding: 8 }}>
          <MaintenanceCalendar />
        </div>
      </div>

      {showBD && <BreakdownModal onClose={() => setShowBD(false)} onSubmit={load} />}
      {showTP && <TakePartModal onClose={() => setShowTP(false)} onSuccess={load} />}
    </div>
  );
}
