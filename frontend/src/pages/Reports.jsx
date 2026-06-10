import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Clock, DollarSign, ShieldCheck, TrendingDown, CheckCircle2, XCircle, FileDown, Eye, Download, Building2, Calendar } from 'lucide-react';
import api from '../api/axios';
import { useMttr, useDowntime, useAuditReport } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const CHART_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'];

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="surface" style={{ padding: 20 }}>
      <div className="flex items-center gap-2 mb-5">
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
      <p className="t-small mb-1">{label}</p>
      <p className="text-sm font-bold text-[var(--tx-1)]">{prefix}{Number(payload[0].value).toLocaleString()}{suffix}</p>
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

function PaperPreview({ report, tmpl, onClose, onDownload, downloading }) {
  const hBg   = tmpl?.primary_color || '#1e3a5f';
  const altBg = tmpl?.accent_color  || '#f1f5f9';
  const today = new Date().toLocaleDateString('en-IN');

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[520px] bg-[var(--bg-2)] border-[var(--line-2)] p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center gap-2.5 px-5 py-3.5 border-b border-[var(--line)]">
          <Eye size={15} color="var(--brand)" />
          <DialogTitle className="text-[var(--tx-1)]">PDF Preview</DialogTitle>
          <span className="text-xs text-[var(--tx-3)]">— {report.label}</span>
        </DialogHeader>

        <div className="p-5">
          <div style={{ border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-md)', background: '#fff', fontFamily: tmpl?.font_family || 'Helvetica, sans-serif' }}>
            <div style={{ padding: '12px 16px', background: hBg, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2.5">
                {tmpl?.include_logo !== false && (
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={18} color="rgba(255,255,255,0.85)" />
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#fff', margin: 0 }}>CPCL — Quality Control Laboratory</p>
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

            <div style={{ padding: '14px 16px', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${tmpl?.body_font_size || 8}px` }}>
                <thead>
                  <tr style={{ background: hBg }}>
                    {['Instrument', 'ID / Code', 'Status', 'Due Date', 'Vendor'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', color: '#fff', textAlign: 'left', fontWeight: 700, fontSize: '0.65rem', border: tmpl?.show_table_borders !== false ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['pH Meter', 'QC-001', '✓ Valid', 'Jun 30 2025', 'Mettler-Toledo'],
                    ['Viscometer', 'QC-002', '⚠ Due', 'Jul 15 2025', 'Anton Paar'],
                    ['Centrifuge', 'QC-003', '✓ Valid', 'Aug 01 2025', 'Eppendorf'],
                    ['Refractomer', 'QC-004', '✓ Valid', 'Sep 12 2025', 'ATAGO'],
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 1 && tmpl?.show_alt_row_color !== false ? altBg : '#fff' }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '4px 8px', color: j === 2 ? (cell.includes('Due') ? '#dc2626' : '#16a34a') : '#374151', fontSize: '0.6rem', fontWeight: j === 2 ? 700 : 400, border: tmpl?.show_table_borders !== false ? '1px solid #e5e7eb' : 'none' }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>Showing sample data — actual report will include all records</p>
            </div>

            {tmpl?.show_signature_block && (
              <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: 4, minWidth: 120 }}>
                  <p style={{ fontSize: '0.55rem', color: '#6b7280' }}>{tmpl.signature_label || 'Authorised Signatory'}</p>
                </div>
              </div>
            )}

            <div style={{ padding: '6px 16px', background: hBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>
                {tmpl?.footer_text || (tmpl?.show_address !== false ? 'Chennai Petroleum Corporation Limited, Manali, Chennai – 600068' : '')}
              </p>
              {tmpl?.show_page_number !== false && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>Page 1 of 1</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3 px-3 py-2 rounded-md" style={{ background: 'var(--bg-3)' }}>
            <Calendar size={13} color="var(--tx-3)" />
            <p className="text-xs text-[var(--tx-2)]">This is a layout preview. The downloaded PDF will contain live data from the database.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 px-5 pb-5">
          <Button variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Close</Button>
          <Button onClick={onDownload} disabled={downloading} className="flex-[2] bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            {downloading ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Download size={13} />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Reports() {
  const [pdfLoading, setPdfLoading] = useState({});
  const [preview,    setPreview]    = useState(null);
  const [tmplCache,  setTmplCache]  = useState({});

  const { data: mttr     = [], isLoading: mttrLoading     } = useMttr();
  const { data: downtime = [], isLoading: downtimeLoading } = useDowntime();
  const { data: audit    = [], isLoading: auditLoading    } = useAuditReport();
  const loading = mttrLoading || downtimeLoading || auditLoading;

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

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[...Array(3)].map((_, i) => <div key={i} className="shimmer-box" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-heading">Reports & Analytics</h1>
        <p className="t-body mt-0.5">Instrument performance and compliance</p>
      </div>

      <div className="surface" style={{ padding: 20 }}>
        <div className="flex items-center gap-2 mb-1">
          <FileDown size={15} color="var(--tx-3)" strokeWidth={1.8} />
          <span className="t-title">Export PDF Reports</span>
        </div>
        <p className="t-body mb-4">Preview the layout before downloading, or download directly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {PDF_REPORTS.map((r) => (
            <div key={r.endpoint} className="flex flex-col overflow-hidden rounded-xl" style={{ border: '1px solid var(--line)', background: 'var(--bg-2)' }}>
              <div style={{ height: 4, background: r.color }} />
              <div className="p-3.5 flex-1">
                <div className="text-[1.375rem] leading-none mb-2">{r.icon}</div>
                <p className="text-sm font-bold text-[var(--tx-1)] mb-1">{r.label}</p>
                <p className="text-xs text-[var(--tx-3)] leading-relaxed">{r.desc}</p>
              </div>
              <div className="flex gap-1.5 px-3 pb-3">
                <Button variant="outline" size="sm" onClick={() => loadTmpl(r)} className="flex-1 text-xs border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
                  <Eye size={11} />Preview
                </Button>
                <Button size="sm" onClick={() => downloadPdf(r.endpoint, r.label)} disabled={pdfLoading[r.endpoint]} className="flex-1 text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
                  {pdfLoading[r.endpoint] ? <span className="w-2.5 h-2.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Download size={11} />}
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <PaperPreview
          report={preview.report}
          tmpl={preview.tmpl}
          onClose={() => setPreview(null)}
          onDownload={() => { downloadPdf(preview.report.endpoint, preview.report.label); setPreview(null); }}
          downloading={pdfLoading[preview.report.endpoint]}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {[
          { icon: Clock,       label: 'Avg MTTR',            color: 'var(--blue)',
            value: mttr.length > 0 ? `${(mttr.reduce((s,r)=>s+(r.mttr_hours||r.mttr||0),0)/mttr.length).toFixed(1)}h` : '—' },
          { icon: DollarSign,  label: 'Total Downtime Cost',  color: 'var(--red)',
            value: downtime.length > 0 ? `₹${Number(downtime.reduce((s,r)=>s+(r.downtime_cost||r.cost||0),0)).toLocaleString('en-IN')}` : '—' },
          { icon: BarChart3,   label: 'Instruments Tracked',  color: 'var(--purple)',
            value: mttr.length || downtime.length || '—' },
          { icon: ShieldCheck, label: 'Audit Records',        color: 'var(--green)',
            value: audit.length },
        ].map(({ icon: Icon, label, color, value }) => (
          <div key={label} className="surface" style={{ padding: '16px 18px' }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="t-label">{label}</span>
              <Icon size={14} color={color} strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--tx-1)' }}>{value}</p>
          </div>
        ))}
      </div>

      <ChartCard title="Mean Time To Repair (MTTR) by Instrument" icon={Clock}>
        {mttr.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 140 }}>
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

      <ChartCard title="Downtime Cost by Instrument (₹)" icon={TrendingDown}>
        {downtime.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 140 }}>
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

      <div className="surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)' }}>
          <ShieldCheck size={14} color="var(--green)" />
          <span className="t-title">Audit Readiness</span>
        </div>
        {audit.length === 0 ? (
          <p className="t-body text-center py-10">No audit data available</p>
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
                      <td className="font-medium">{row.instrument_name || row.instrument}</td>
                      <td><span style={{ color: row.calibration_status === 'passed' || row.calibration_ok ? 'var(--green)' : 'var(--red)' }}>{row.calibration_status || (row.calibration_ok ? 'OK' : 'Due')}</span></td>
                      <td><span style={{ color: row.amc_active || row.amc_status === 'active' ? 'var(--green)' : 'var(--red)' }}>{row.amc_status || (row.amc_active ? 'Active' : 'Inactive')}</span></td>
                      <td className="t-small">{row.last_maintenance_date || '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 80, height: 4, background: 'var(--bg-4)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${row.compliance_score||0}%`, height: '100%', background: (row.compliance_score||0)>=80 ? 'var(--green)' : 'var(--orange)', borderRadius: 99 }} />
                          </div>
                          <span className="t-small">{row.compliance_score ?? '—'}%</span>
                        </div>
                      </td>
                      <td>
                        {ready ? <CheckCircle2 size={18} color="var(--green)" /> : <XCircle size={18} color="var(--red)" />}
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
