import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Save, Eye, RefreshCw, ChevronDown, ChevronRight,
  Type, Layout, Palette, AlignLeft, PenLine, Droplets, Info,
  Check, Loader2, AlertTriangle, Download
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';

const REPORT_TYPES = [
  { value: 'calibration',   label: 'Calibration Report',      icon: '🧪' },
  { value: 'amc',           label: 'AMC / Contract Report',   icon: '📋' },
  { value: 'vendors',       label: 'Vendor List',             icon: '🏢' },
  { value: 'service_month', label: 'Service Month Report',    icon: '🔧' },
  { value: 'audit',         label: 'Audit Readiness Report',  icon: '🛡️' },
];

const PAPER_SIZES = ['A4', 'Letter', 'A3'];
const ORIENTATIONS = ['portrait', 'landscape'];

const DEFAULTS = {
  title: '',
  header_text: '',
  footer_text: '',
  confidential_text: 'CONFIDENTIAL — FOR INTERNAL USE ONLY',
  include_logo: true,
  show_address: true,
  show_page_number: true,
  show_generated_date: true,
  show_watermark: false,
  watermark_text: 'DRAFT',
  show_signature_block: false,
  signature_label: 'Authorised Signatory',
  show_confidential_banner: false,
  show_table_borders: true,
  show_alt_row_color: true,
  primary_color: '#1e3a5f',
  accent_color: '#f1f5f9',
  body_font_size: 8,
  paper_size: 'A4',
  orientation: 'portrait',
  margin_top: 20,
  margin_bottom: 20,
  margin_left: 15,
  margin_right: 15,
};

/* ── section wrapper ─────────────────────────────────────── */
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: 'var(--surface-overlay)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-overlay)'}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
               : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>
      {open && (
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── field components ─────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-label block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>{hint}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0 w-10 h-5 rounded-full relative transition-all duration-200 mt-0.5"
        style={{ background: checked ? 'var(--primary)' : 'var(--border-strong)' }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
          style={{ left: checked ? 'calc(100% - 18px)' : '2px' }}
        />
      </button>
    </label>
  );
}

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-label flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#1e3a5f'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-8 cursor-pointer rounded-md border-0 p-0.5"
          style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1e3a5f"
          className="w-24 text-xs rounded-lg px-2 py-1.5 font-mono"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-default)',
  borderRadius: '8px',
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  fontFamily: 'inherit',
  outline: 'none',
};

/* ── Live Header Preview card ─────────────────────────────── */
function LivePreview({ form, company }) {
  const primary = form.primary_color || company?.primary_color || '#1e3a5f';
  const companyName = company?.company_name || 'Your Company';
  const tagline = company?.tagline || 'IMMS Platform';
  const title = form.title || 'Report Title';

  return (
    <div className="space-y-3">
      {/* Header preview */}
      <div
        className="rounded-xl overflow-hidden shadow-lg"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="px-5 py-3.5"
          style={{ background: primary }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-white text-sm">{companyName}</p>
              <p className="text-white/80 text-xs mt-0.5">{title}</p>
              {form.header_text && (
                <p className="text-white/60 text-[10px] mt-1 truncate max-w-[200px]">{form.header_text}</p>
              )}
            </div>
            <div className="text-right">
              {form.show_generated_date && (
                <p className="text-white/80 text-xs">{new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
              )}
              {tagline && <p className="text-white/60 text-[10px] mt-0.5 italic">{tagline}</p>}
            </div>
          </div>
        </div>

        {/* Watermark strip */}
        {form.show_watermark && form.watermark_text && (
          <div
            className="px-5 py-1 text-center text-xs font-bold tracking-widest opacity-30"
            style={{ color: primary, borderBottom: `1px solid var(--border-subtle)` }}
          >
            — {form.watermark_text.toUpperCase()} —
          </div>
        )}

        {/* Table preview */}
        <div className="p-4 overflow-x-auto" style={{ background: 'var(--surface-raised)' }}>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Column A', 'Column B', 'Column C', 'Column D', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-semibold text-white"
                    style={{ background: primary, fontSize: '10px', borderBottom: form.show_table_borders ? `1px solid ${primary}` : 'none' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map((r) => (
                <tr
                  key={r}
                  style={{
                    background: form.show_alt_row_color && r % 2 === 1
                      ? (form.accent_color || '#f1f5f9')
                      : 'white',
                  }}
                >
                  {['Sample data', 'Value', 'Data', 'Info', 'Active'].map((c, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-1.5 text-gray-700"
                      style={{
                        fontSize: `${form.body_font_size || 8}px`,
                        border: form.show_table_borders ? '0.5px solid #e2e8f0' : 'none',
                        borderBottom: '0.5px solid #e2e8f0',
                      }}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature block */}
        {form.show_signature_block && (
          <div className="px-5 py-3" style={{ background: 'var(--surface-raised)' }}>
            <div className="w-32 border-t pt-1" style={{ borderColor: '#94a3b8' }}>
              <p className="text-[10px] text-gray-500">{form.signature_label || 'Authorised Signatory'}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 py-2 flex items-center justify-between"
          style={{ background: primary }}
        >
          <p className="text-white/80 text-[10px] truncate max-w-xs">
            {form.footer_text || company?.address || 'Footer address / text here'}
          </p>
          {form.show_page_number && (
            <p className="text-white/80 text-[10px] flex-shrink-0 ml-2">Page 1</p>
          )}
        </div>

        {form.show_confidential_banner && form.confidential_text && (
          <div
            className="text-center py-1 text-[9px] font-semibold tracking-wide"
            style={{ color: primary, borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}
          >
            {form.confidential_text}
          </div>
        )}
      </div>

      {/* Page spec tags */}
      <div className="flex flex-wrap gap-2">
        {[
          form.paper_size,
          form.orientation,
          `Font ${form.body_font_size}pt`,
          `Margins ${form.margin_top}/${form.margin_right}/${form.margin_bottom}/${form.margin_left} mm`,
        ].map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main editor ─────────────────────────────────────────── */
export default function PdfTemplateEditor() {
  const toast = useToast();
  const [reportType, setReportType] = useState('calibration');
  const [form, setForm] = useState(DEFAULTS);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  /* load company settings once */
  useEffect(() => {
    api.get('settings/').then((r) => setCompany(r.data)).catch(() => {});
  }, []);

  /* load template when report type changes */
  useEffect(() => {
    setLoading(true);
    api.get(`settings/pdf-templates/${reportType}/`)
      .then((r) => setForm({ ...DEFAULTS, ...r.data }))
      .catch(() => setForm(DEFAULTS))
      .finally(() => setLoading(false));
  }, [reportType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`settings/pdf-templates/${reportType}/`, form);
      setSaved(true);
      toast('Template saved successfully.', 'success');
    } catch {
      toast('Failed to save template.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    /* save first, then open preview */
    setPreviewing(true);
    try {
      await api.patch(`settings/pdf-templates/${reportType}/`, form);
      const res = await api.get(`reports/pdf/preview/${reportType}/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast('Failed to generate preview.', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    try {
      await api.patch(`settings/pdf-templates/${reportType}/`, form);
      const ENDPOINTS = {
        calibration:   'reports/pdf/calibration/',
        amc:           'reports/pdf/amc/',
        vendors:       'reports/pdf/vendors/',
        service_month: 'reports/pdf/service-month/',
        audit:         'reports/pdf/audit/',
      };
      const res = await api.get(ENDPOINTS[reportType], { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download PDF.', 'error');
    }
  };

  const current = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)' }}
          >
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-title" style={{ color: 'var(--text-primary)' }}>PDF Template Editor</h1>
            <p className="text-caption">Customise report layout, branding and content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} disabled={previewing} className="btn-ghost">
            {previewing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Eye className="w-4 h-4" />}
            Preview PDF
          </button>
          <button onClick={handleDownload} className="btn-ghost">
            <Download className="w-4 h-4" />
            Download
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.value}
            onClick={() => setReportType(rt.value)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all duration-150"
            style={{
              background: reportType === rt.value ? 'rgba(37,99,235,0.12)' : 'var(--surface-overlay)',
              border: `1px solid ${reportType === rt.value ? 'rgba(37,99,235,0.35)' : 'var(--border-subtle)'}`,
              color: reportType === rt.value ? '#60a5fa' : 'var(--text-secondary)',
            }}
          >
            <span className="text-lg">{rt.icon}</span>
            <span className="text-center leading-tight">{rt.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: form ─────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-3">

            {/* Content */}
            <Section title="Content & Text" icon={Type}>
              <Field label="Report Title" hint="Overrides default title shown in header. Leave blank to use default.">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder={`e.g. ${current?.label}`}
                  style={inputStyle}
                />
              </Field>
              <Field label="Header Sub-text" hint="Extra line shown below the title inside the header bar.">
                <input
                  type="text"
                  value={form.header_text}
                  onChange={(e) => set('header_text', e.target.value)}
                  placeholder="e.g. Internal QC Lab — Petroleum Division"
                  style={inputStyle}
                />
              </Field>
              <Field label="Footer Text" hint="Shown on the bottom-left of every page. Defaults to company address.">
                <input
                  type="text"
                  value={form.footer_text}
                  onChange={(e) => set('footer_text', e.target.value)}
                  placeholder="e.g. 123 Industrial Area, Mumbai — Confidential"
                  style={inputStyle}
                />
              </Field>
            </Section>

            {/* Visibility */}
            <Section title="Visibility Options" icon={Layout}>
              <Toggle label="Show company logo" checked={form.include_logo} onChange={(v) => set('include_logo', v)} hint="Displays logo in header if uploaded in Company Settings" />
              <Toggle label="Show company address in footer" checked={form.show_address} onChange={(v) => set('show_address', v)} />
              <Toggle label="Show generated date" checked={form.show_generated_date} onChange={(v) => set('show_generated_date', v)} />
              <Toggle label="Show page numbers" checked={form.show_page_number} onChange={(v) => set('show_page_number', v)} />
              <Toggle label="Alternating row shading" checked={form.show_alt_row_color} onChange={(v) => set('show_alt_row_color', v)} hint="Alternate background color on table rows" />
              <Toggle label="Table grid borders" checked={form.show_table_borders} onChange={(v) => set('show_table_borders', v)} />
            </Section>

            {/* Branding */}
            <Section title="Branding & Colours" icon={Palette}>
              <ColorPicker label="Primary color" value={form.primary_color} onChange={(v) => set('primary_color', v)} />
              <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>Leave blank to use company primary colour from Settings → Company</p>
              <ColorPicker label="Alternate row color" value={form.accent_color} onChange={(v) => set('accent_color', v)} />
              <Field label={`Body font size: ${form.body_font_size}pt`}>
                <input
                  type="range" min={6} max={12} step={1}
                  value={form.body_font_size}
                  onChange={(e) => set('body_font_size', Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--text-disabled)' }}>
                  <span>6pt (tiny)</span><span>8pt (default)</span><span>12pt (large)</span>
                </div>
              </Field>
            </Section>

            {/* Page layout */}
            <Section title="Page Layout" icon={Layout}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Paper size">
                  <select value={form.paper_size} onChange={(e) => set('paper_size', e.target.value)} style={inputStyle}>
                    {PAPER_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Orientation">
                  <select value={form.orientation} onChange={(e) => set('orientation', e.target.value)} style={inputStyle}>
                    {ORIENTATIONS.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </Field>
              </div>
              <p className="text-label mt-2">Margins (mm)</p>
              <div className="grid grid-cols-4 gap-2">
                {[['margin_top','Top'],['margin_bottom','Bottom'],['margin_left','Left'],['margin_right','Right']].map(([key, lbl]) => (
                  <Field key={key} label={lbl}>
                    <input
                      type="number" min={5} max={50} step={1}
                      value={form[key]}
                      onChange={(e) => set(key, Number(e.target.value))}
                      style={{ ...inputStyle, textAlign: 'center' }}
                    />
                  </Field>
                ))}
              </div>
            </Section>

            {/* Watermark */}
            <Section title="Watermark" icon={Droplets} defaultOpen={false}>
              <Toggle label="Enable watermark" checked={form.show_watermark} onChange={(v) => set('show_watermark', v)} hint="Diagonal text across the page background" />
              {form.show_watermark && (
                <Field label="Watermark text">
                  <input
                    type="text"
                    value={form.watermark_text}
                    onChange={(e) => set('watermark_text', e.target.value)}
                    placeholder="e.g. DRAFT or CONFIDENTIAL"
                    style={inputStyle}
                  />
                </Field>
              )}
            </Section>

            {/* Signature */}
            <Section title="Signature Block" icon={PenLine} defaultOpen={false}>
              <Toggle
                label="Show signature line"
                checked={form.show_signature_block}
                onChange={(v) => set('show_signature_block', v)}
                hint="Adds a signature line at the end of the report"
              />
              {form.show_signature_block && (
                <Field label="Signature label">
                  <input
                    type="text"
                    value={form.signature_label}
                    onChange={(e) => set('signature_label', e.target.value)}
                    placeholder="e.g. Quality Manager"
                    style={inputStyle}
                  />
                </Field>
              )}
            </Section>

            {/* Confidential banner */}
            <Section title="Confidential Banner" icon={AlertTriangle} defaultOpen={false}>
              <Toggle
                label="Show confidentiality notice"
                checked={form.show_confidential_banner}
                onChange={(v) => set('show_confidential_banner', v)}
                hint="Small text strip between footer bar and body"
              />
              {form.show_confidential_banner && (
                <Field label="Notice text">
                  <input
                    type="text"
                    value={form.confidential_text}
                    onChange={(e) => set('confidential_text', e.target.value)}
                    placeholder="CONFIDENTIAL — FOR INTERNAL USE ONLY"
                    style={inputStyle}
                  />
                </Field>
              )}
            </Section>

          </div>

          {/* ── Right: live preview ────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <div
              className="sticky top-4 rounded-xl p-4 space-y-3"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Live Preview</p>
                <span className="badge badge-blue">Visual Mock</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Updates as you edit. Use "Preview PDF" to see the actual document.
              </p>
              <LivePreview form={form} company={company} />
              <div
                className="rounded-lg p-3 flex gap-2"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: '#93c5fd' }}>
                  Click <strong>Preview PDF</strong> to open a real PDF with sample data.
                  Click <strong>Download</strong> to generate with live data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
