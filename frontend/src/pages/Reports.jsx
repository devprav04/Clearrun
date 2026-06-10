import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Clock, DollarSign, ShieldCheck, TrendingDown, CheckCircle2, XCircle, FileDown, Eye, Download, X, Building2, Calendar } from 'lucide-react';
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
  { label: 'Calibration Report',    endpoint: 'reports/pdf/calibration/',   icon: '📋', desc: 'All calibration records with due dates', color: '#3b82f6' },
  { label: 'AMC / Contract Report', endpoint: 'reports/pdf/amc/',           icon: '📄', desc: 'Active AMC contracts and expiry status', color: '#a855f7' },
  { label: 'Vendor List',           endpoint: 'reports/pdf/vendors/',       icon: '🏢', desc: 'All registered vendors with contacts',   color: '#06b6d4' },
  { label: 'Service This Month',    endpoint: 'reports/pdf/service-month/', icon: '🔧', desc: 'Maintenance services in current month',  color: '#f59e0b' },
  { label: 'Audit Readiness',       endpoint: 'reports/pdf/audit/',         icon: '✅', desc: 'Compliance status and audit summary',    color: '#22c55e' },
];

/* ── Mini paper preview mockup ──────────────────────────── */
function PaperPreview({ report, tmpl, onClose, onDownload, downloading }) {
  const hBg  = tmpl?.primary_color || '#1e3a5f';
  const altBg = tmpl?.accent_color || '#f1f5f9';
  const today = new Date().toLocaleDateString('en-IN');

  return (
    <div className="overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal animate-slide-in" style={{ width: '100%', maxWidth: 520, padding: 0 }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={15} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tx-1)' }}>PDF Preview</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>— {report.label}</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--tx-3)' }}><X size={13} /></button>
        </div>

        {/* Paper mockup */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-md)', background: '#fff', fontFamily: tmpl?.font_family || 'Helvetica, sans-serif' }}>

            {/* Header bar */}
            <div style={{ padding: '12px 16px', background: hBg, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {tmpl?.include_logo !== false && (
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={18} color="rgba(255,255,255,0.85)" />
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.01em' }}>CPCL — Quality Control Laboratory</p>
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{tmpl?.title || report.label}</p>
                  {tmpl?.header_text && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', marginTop: 1, fontStyle: 'italic' }}>{tmpl.header_text}</p>}
                </div>
              </div>
              {tmpl?.show_generated_date !== false && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>Generated</p>
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{today}</p>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ padding: '14px 16px', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${tmpl?.body_font_size || 8}px` }}>
                <thead>
                  <tr style={{ background: hBg }}>
                    {['Instrument', 'ID / Code', 'Status', 'Due Date', 'Vendor'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', color: '#fff', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem',
                        border: tmpl?.show_table_borders !== false ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['pH Meter',    'QC-001', '✓ Valid', 'Jun 30 2025', 'Mettler-Toledo'],
                    ['Viscometer',  'QC-002', '⚠ Due',   'Jul 15 2025', 'Anton Paar'],
                    ['Centrifuge',  'QC-003', '✓ Valid', 'Aug 01 2025', 'Eppendorf'],
                    ['Refractomer', 'QC-004', '✓ Valid', 'Sep 12 2025', 'ATAGO'],
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 && tmpl?.show_alt_row_color !== false ? altBg : '#fff' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '4px 8px', color: j === 2 ? (cell.includes('Due') ? '#dc2626' : '#16a34a') : '#374151', fontSize: '0.6rem',
                          fontWeight: j === 2 ? 700 : 400,
                          border: tmpl?.show_table_borders !== false ? '1px solid #e5e7eb' : 'none' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>Showing sample data — actual report will include all records</p>
            </div>

            {/* Signature block */}
            {tmpl?.show_signature_block && (
              <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: 4, minWidth: 120 }}>
                  <p style={{ fontSize: '0.55rem', color: '#6b7280' }}>{tmpl.signature_label || 'Authorised Signatory'}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '6px 16px', background: hBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>
                {tmpl?.footer_text || (tmpl?.show_address !== false ? 'Chennai Petroleum Corporation Limited, Manali, Chennai – 600068' : '')}
              </p>
              {tmpl?.show_page_number !== false && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>Page 1 of 1</p>}
            </div>
          </div>

          {/* Info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 'var(--r-md)' }}>
            <Calendar size={13} color="var(--tx-3)" />
            <p style={{ fontSize: '0.75rem', color: 'var(--tx-2)' }}>This is a layout preview. The downloaded PDF will contain live data from the database.</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '0 24px 20px' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Close</button>
          <button onClick={onDownload} disabled={downloading} className="btn btn-primary" style={{ flex: 2 }}>
            {downloading
              ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
              : <Download size={13} />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [mttr, setMttr] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [preview, setPreview] = useState(null);     // { report, tmpl }
  const [tmplCache, setTmplCache] = useState({});   // endpoint → tmpl

  const loadTmpl = async (report) => {
    const key = report.endpoint;
    if (tmplCache[key]) { setPreview({ report, tmpl: tmplCache[key] }); return; }
    try {
      const typeMap = {
        'reports/pdf/calibration/':   'calibration',
        'reports/pdf/amc/':           'amc',
        'reports/pdf/vendors/':       'vendors',
        'reports/pdf/service-month/': 'service_month',
        'reports/pdf/audit/':         'audit',
      };
      const r = await api.get(`settings/pdf-templates/${typeMap[key]}/`);
      setTmplCache(c => ({ ...c, [key]: r.data }));
      setPreview({ report, tmpl: r.data });
    } catch {
      setPreview({ report, tmpl: null });
    }
  };

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
    (async () => {
      try {
        const [m, d, a] = await Promise.all([
          api.get('reports/mttr/').catch(() => ({ data: [] })),
          api.get('reports/downtime-cost/').catch(() => ({ data: [] })),
          api.get('reports/audit/').catch(() => ({ data: [] })),
        ]);
        setMttr(m.data?.results || m.data || []);
        setDowntime(d.data?.results || d.data || []);
        setAudit(a.data?.results || a.data || []);
      } catch { /* empty states already set */ }
      finally { setLoading(false); }
    })();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileDown size={15} color="var(--tx-3)" strokeWidth={1.8} />
          <span className="t-title">Export PDF Reports</span>
        </div>
        <p className="t-body" style={{ marginBottom: 16 }}>Preview the layout before downloading, or download directly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {PDF_REPORTS.map((r) => (
            <div key={r.endpoint} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column' }}>
              {/* Color strip */}
              <div style={{ height: 4, background: r.color }} />
              <div style={{ padding: '14px 14px 12px', flex: 1 }}>
                <div style={{ fontSize: '1.375rem', lineHeight: 1, marginBottom: 8 }}>{r.icon}</div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--tx-1)', marginBottom: 4 }}>{r.label}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--tx-3)', lineHeight: 1.4 }}>{r.desc}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '0 12px 12px' }}>
                <button onClick={() => loadTmpl(r)} className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '0.75rem' }}>
                  <Eye size={11} /> Preview
                </button>
                <button onClick={() => downloadPdf(r.endpoint, r.label)} disabled={pdfLoading[r.endpoint]} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.75rem' }}>
                  {pdfLoading[r.endpoint]
                    ? <span style={{ width: 11, height: 11, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                    : <Download size={11} />}
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <PaperPreview
          report={preview.report}
          tmpl={preview.tmpl}
          onClose={() => setPreview(null)}
          onDownload={() => { downloadPdf(preview.report.endpoint, preview.report.label); setPreview(null); }}
          downloading={pdfLoading[preview.report.endpoint]}
        />
      )}

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
          <div className="table-wrap">
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
