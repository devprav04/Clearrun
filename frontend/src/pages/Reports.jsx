import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Clock, DollarSign, ShieldCheck, TrendingDown, CheckCircle2, XCircle, FileDown } from 'lucide-react';
import api from '../api/axios';

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'];

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Icon size={15} color="var(--tx-3)" strokeWidth={1.8} />
        <span className="t-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (active && payload?.length) return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,.4)' }}>
      <p className="t-small" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--tx-1)' }}>{prefix}{Number(payload[0].value).toLocaleString()}{suffix}</p>
    </div>
  );
  return null;
};

const PDF_REPORTS = [
  { label: 'Calibration Report',   endpoint: 'reports/pdf/calibration/' },
  { label: 'AMC / Contract Report',endpoint: 'reports/pdf/amc/' },
  { label: 'Vendor List',          endpoint: 'reports/pdf/vendors/' },
  { label: 'Service This Month',   endpoint: 'reports/pdf/service-month/' },
  { label: 'Audit Readiness',      endpoint: 'reports/pdf/audit/' },
];

export default function Reports() {
  const [mttr, setMttr] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});

  const downloadPdf = async (endpoint, label) => {
    setPdfLoading(s => ({ ...s, [endpoint]: true }));
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `${label.toLowerCase().replace(/\W+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Failed to generate PDF.'); }
    finally { setPdfLoading(s => ({ ...s, [endpoint]: false })); }
  };

  useEffect(() => {
    Promise.all([
      api.get('reports/mttr/').catch(() => ({ data: [] })),
      api.get('reports/downtime-cost/').catch(() => ({ data: [] })),
      api.get('reports/audit/').catch(() => ({ data: [] })),
    ]).then(([m, d, a]) => {
      setMttr(m.data?.results || m.data || []);
      setDowntime(d.data?.results || d.data || []);
      setAudit(a.data?.results || a.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[...Array(3)].map((_, i) => <div key={i} className="shimmer-box" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="t-heading">Reports & Analytics</h1>
        <p className="t-body" style={{ marginTop: 2 }}>Instrument performance and compliance</p>
      </div>

      {/* PDF Export */}
      <div className="surface" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FileDown size={15} color="var(--tx-3)" strokeWidth={1.8} />
          <span className="t-title">Export PDF Reports</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {PDF_REPORTS.map(({ label, endpoint }) => (
            <button key={endpoint} onClick={() => downloadPdf(endpoint, label)} disabled={pdfLoading[endpoint]}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 12px', borderRadius: 'var(--r-md)', textAlign: 'center',
                border: '1px solid var(--line)', background: 'var(--bg-3)', cursor: 'pointer',
                transition: 'all .12s', fontFamily: 'inherit', opacity: pdfLoading[endpoint] ? .5 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--bg-4)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
            >
              {pdfLoading[endpoint]
                ? <span style={{ width: 18, height: 18, border: '2px solid var(--line-2)', borderTopColor: 'var(--tx-2)', borderRadius: '50%' }} className="animate-spin" />
                : <FileDown size={18} color="var(--tx-3)" />}
              <span style={{ fontSize: '0.75rem', color: 'var(--tx-2)', lineHeight: 1.3 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {[
          { icon: Clock, label: 'Avg MTTR', color: 'var(--blue)',
            value: mttr.length > 0 ? `${(mttr.reduce((s,r)=>s+(r.mttr_hours||r.mttr||0),0)/mttr.length).toFixed(1)}h` : '—' },
          { icon: DollarSign, label: 'Total Downtime Cost', color: 'var(--red)',
            value: downtime.length > 0 ? `₹${Number(downtime.reduce((s,r)=>s+(r.downtime_cost||r.cost||0),0)).toLocaleString('en-IN')}` : '—' },
          { icon: BarChart3, label: 'Instruments Tracked', color: 'var(--purple)',
            value: mttr.length || downtime.length || '—' },
          { icon: ShieldCheck, label: 'Audit Records', color: 'var(--green)',
            value: audit.length },
        ].map(({ icon: Icon, label, color, value }) => (
          <div key={label} className="surface" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="t-label">{label}</span>
              <Icon size={14} color={color} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--tx-1)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* MTTR Chart */}
      <ChartCard title="Mean Time To Repair (MTTR) by Instrument" icon={Clock}>
        {mttr.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
            <p className="t-body">No MTTR data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mttr} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="instrument_name" tick={{ fill: 'var(--tx-3)', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: 'var(--tx-3)', fontSize: 11 }} unit="h" />
              <Tooltip content={<CustomTooltip suffix="h" />} />
              <Bar dataKey="mttr_hours" radius={[4,4,0,0]}>
                {mttr.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Downtime Cost Chart */}
      <ChartCard title="Downtime Cost by Instrument (₹)" icon={TrendingDown}>
        {downtime.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
            <p className="t-body">No downtime cost data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={downtime} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="instrument_name" tick={{ fill: 'var(--tx-3)', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: 'var(--tx-3)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Bar dataKey="downtime_cost" radius={[4,4,0,0]}>
                {downtime.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Audit Readiness */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <ShieldCheck size={14} color="var(--green)" />
          <span className="t-title">Audit Readiness</span>
        </div>
        {audit.length === 0 ? (
          <p className="t-body" style={{ textAlign: 'center', padding: '40px 0' }}>No audit data available</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Instrument', 'Calibration Status', 'AMC Status', 'Last Maintenance', 'Compliance', 'Audit Ready'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {audit.map((row, idx) => {
                  const ready = row.audit_ready ?? row.is_compliant;
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{row.instrument_name || row.instrument}</td>
                      <td><span style={{ color: row.calibration_status === 'passed' || row.calibration_ok ? 'var(--green)' : 'var(--red)' }}>{row.calibration_status || (row.calibration_ok ? 'OK' : 'Due')}</span></td>
                      <td><span style={{ color: row.amc_active || row.amc_status === 'active' ? 'var(--green)' : 'var(--red)' }}>{row.amc_status || (row.amc_active ? 'Active' : 'Inactive')}</span></td>
                      <td className="t-small">{row.last_maintenance_date || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 4, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${row.compliance_score||0}%`, height: '100%', background: (row.compliance_score||0)>=80 ? 'var(--green)' : 'var(--orange)', borderRadius: 99 }} />
                          </div>
                          <span className="t-small">{row.compliance_score ?? '—'}%</span>
                        </div>
                      </td>
                      <td>
                        {ready
                          ? <CheckCircle2 size={18} color="var(--green)" />
                          : <XCircle size={18} color="var(--red)" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
