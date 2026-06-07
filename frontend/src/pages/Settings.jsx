import { useState, useRef, useEffect } from 'react';
import { Settings2, Upload, Building2, Phone, MapPin, Palette, Save, X, Tag, List, FileText, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/Toast';

const TABS = [
  { id: 'company', label: 'Company', Icon: Building2 },
  { id: 'codes',   label: 'Equipment Codes', Icon: Tag },
  { id: 'options', label: 'Custom Options',  Icon: List },
  { id: 'pdf',     label: 'PDF Templates',   Icon: FileText },
];

/* ─── Helpers ───────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Icon size={14} color="var(--tx-3)" />
        <span className="t-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Company Tab ───────────────────────────────────────────────── */
function CompanyTab() {
  const { settings, fetchSettings, previewColor } = useSettings();
  const toast = useToast();
  const [form, setForm] = useState({ company_name: '', tagline: '', address: '', phone: '', email: '', primary_color: '#2563eb' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (settings) {
      setForm({ company_name: settings.company_name||'', tagline: settings.tagline||'', address: settings.address||'', phone: settings.phone||'', email: settings.email||'', primary_color: settings.primary_color||'#2563eb' });
      setLogoPreview(settings.logo_url || null);
    }
  }, [settings]);

  const set = k => e => {
    const val = e.target.value; setForm(f => ({ ...f, [k]: val }));
    if (k === 'primary_color') previewColor(val);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (logoFile) fd.append('logo', logoFile);
      await api.patch('settings/company/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchSettings(); toast('Settings saved.', 'success');
    } catch { toast('Failed to save settings.', 'error'); }
    finally { setLoading(false); }
  };

  const PRESET_COLORS = [
    '#2563eb','#0ea5e9','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#9333ea',
  ];

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <Section title="Company Logo" icon={Building2}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'var(--bg-3)', border: '1px dashed var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Building2 size={28} color="var(--tx-3)" />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-primary btn-sm">
                <Upload size={12} />{logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              {logoPreview && <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="btn btn-danger btn-sm"><X size={12} /></button>}
            </div>
            <p className="t-small">PNG, JPG, SVG · max 2MB</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (!f) return; setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
          </div>
        </div>
      </Section>

      <Section title="Organization" icon={Building2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Company / Lab Name *"><input required value={form.company_name} onChange={set('company_name')} className="input" placeholder="HPCL QC Laboratory" /></Field>
          <Field label="Tagline"><input value={form.tagline} onChange={set('tagline')} className="input" placeholder="Instrument Management System" /></Field>
          <Field label="Address"><textarea rows={2} value={form.address} onChange={set('address')} className="input" /></Field>
        </div>
      </Section>

      <Section title="Contact" icon={Phone}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Phone"><input value={form.phone} onChange={set('phone')} className="input" placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set('email')} className="input" placeholder="lab@company.com" /></Field>
        </div>
      </Section>

      <Section title="Accent Color" icon={Palette}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="color" value={form.primary_color} onChange={set('primary_color')} style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, flexShrink: 0 }} />
            <div>
              <p className="t-mono" style={{ color: 'var(--tx-1)', fontWeight: 500 }}>{form.primary_color}</p>
              <p className="t-small">Applied live across the UI</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => { setForm(f => ({ ...f, primary_color: c })); previewColor(c); }}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${form.primary_color === c ? '#fff' : 'transparent'}`, transition: 'transform .12s', transform: form.primary_color === c ? 'scale(1.15)' : 'scale(1)' }} />
            ))}
          </div>
        </div>
      </Section>

      <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', maxWidth: 600 }}>
        {loading ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={14} />}
        Save Settings
      </button>
    </form>
  );
}

/* ─── Equipment Codes Tab ───────────────────────────────────────── */
function CodesTab() {
  const toast = useToast();
  const [form, setForm] = useState({ company_code: '', department_code: '', sub_dept_code: '' });
  const [loading, setLoading] = useState(false);
  const [exampleType, setExampleType] = useState('UVF');

  useEffect(() => {
    api.get('settings/company/').then(r => setForm({
      company_code:    r.data.company_code    || '',
      department_code: r.data.department_code || '',
      sub_dept_code:   r.data.sub_dept_code   || '',
    }));
  }, []);

  const parts = [form.company_code, form.department_code, form.sub_dept_code, exampleType || 'TYPE'].filter(Boolean);
  const preview = `${parts.join('/')}/1`;

  const handleSave = async e => {
    e.preventDefault(); setLoading(true);
    try { await api.patch('settings/company/', form); toast('Equipment code settings saved.', 'success'); }
    catch { toast('Failed to save.', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 480 }}>
      <Section title="Equipment Code Format" icon={Tag}>
        <p className="t-body" style={{ marginBottom: 16 }}>
          Codes are auto-generated in the format <span className="t-mono" style={{ color: 'var(--tx-1)' }}>COMPANY/DEPT/SUBDEPT/TYPE/NUMBER</span>.<br />
          Set your organization's fixed segments below.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { key: 'company_code',    label: 'Company Code',   placeholder: 'e.g. CPCL' },
            { key: 'department_code', label: 'Department Code', placeholder: 'e.g. MAN' },
            { key: 'sub_dept_code',   label: 'Sub-dept Code',  placeholder: 'e.g. QC' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
              <input
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value.toUpperCase() }))}
                className="input t-mono"
                placeholder={placeholder}
                maxLength={20}
              />
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 16px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p className="t-small">Live Preview</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="t-small">Instrument type:</span>
              <input
                value={exampleType}
                onChange={e => setExampleType(e.target.value.toUpperCase())}
                className="input t-mono"
                style={{ width: 72, padding: '3px 8px', fontSize: '0.8125rem' }}
                placeholder="UVF"
                maxLength={10}
              />
            </div>
          </div>
          <p className="t-mono" style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '0.04em' }}>{preview}</p>
          <p className="t-small" style={{ marginTop: 6 }}>
            <span style={{ color: 'var(--tx-2)' }}>Instrument type abbreviation</span> is entered per-instrument when adding a new instrument.
          </p>
        </div>
      </Section>
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? <span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={13} />}
        Save Settings
      </button>
    </form>
  );
}

/* ─── Custom Options Tab ────────────────────────────────────────── */
const FIELD_OPTIONS = [
  { value: 'department',           label: 'Department' },
  { value: 'location',             label: 'Location / Room' },
  { value: 'instrument_category',  label: 'Instrument Category' },
  { value: 'maintenance_type',     label: 'Maintenance Type' },
  { value: 'spare_part_category',  label: 'Spare Part Category' },
];

function CustomOptionsTab() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [fieldFilter, setFieldFilter] = useState('department');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchOptions = () => {
    api.get(`settings/options/?field=${fieldFilter}`).then(r => setItems(r.data?.results || r.data || []));
  };
  useEffect(() => { fetchOptions(); }, [fieldFilter]);

  const handleAdd = async e => {
    e.preventDefault(); if (!newLabel.trim()) return;
    setLoading(true);
    try {
      await api.post('settings/options/', { field: fieldFilter, label: newLabel.trim(), value: newLabel.trim().toLowerCase().replace(/\s+/g,'_') });
      setNewLabel(''); fetchOptions(); toast('Option added.', 'success');
    } catch (err) { toast(err.response?.data?.non_field_errors?.[0] || 'Failed to add option.', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async id => {
    try { await api.delete(`settings/options/${id}/`); fetchOptions(); toast('Option removed.', 'success'); }
    catch { toast('Failed to remove.', 'error'); }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <Section title="Custom Dropdown Options" icon={List}>
        <p className="t-body" style={{ marginBottom: 14 }}>Add custom values that appear in dropdown menus across the app.</p>
        <div style={{ marginBottom: 14 }}>
          <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Field</label>
          <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} className="input">
            {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={`Add new ${FIELD_OPTIONS.find(o=>o.value===fieldFilter)?.label||'option'}…`} className="input" style={{ flex: 1 }} />
          <button type="submit" disabled={loading || !newLabel.trim()} className="btn btn-primary" style={{ flexShrink: 0 }}><Plus size={13} /></button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {items.length === 0
            ? <p className="t-body" style={{ textAlign: 'center', padding: '24px 0' }}>No options yet</p>
            : items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--tx-1)' }}>{item.label}</p>
                  <p className="t-mono t-small">{item.value}</p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="btn btn-danger btn-sm" style={{ padding: '0 8px' }}><Trash2 size={12} /></button>
              </div>
            ))
          }
        </div>
      </Section>
    </div>
  );
}

/* ─── PDF Templates Tab ─────────────────────────────────────────── */
const PDF_REPORT_TYPES = [
  { value: 'calibration',   label: 'Calibration Report' },
  { value: 'amc',           label: 'AMC / Contract Report' },
  { value: 'vendors',       label: 'Vendor List' },
  { value: 'service_month', label: 'Service Month Report' },
  { value: 'audit',         label: 'Audit Readiness Report' },
];

function PDFTemplatesTab() {
  const toast = useToast();
  const [selected, setSelected] = useState('calibration');
  const [tmpl, setTmpl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`settings/pdf-templates/${selected}/`).then(r => setTmpl(r.data)).finally(() => setLoading(false));
  }, [selected]);

  const set = k => e => setTmpl(t => ({ ...t, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try { await api.patch(`settings/pdf-templates/${selected}/`, tmpl); toast('Template saved.', 'success'); }
    catch { toast('Failed to save template.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 580 }}>
      <Section title="PDF Template Editor" icon={FileText}>
        <p className="t-body" style={{ marginBottom: 14 }}>Customize the header, footer and display options for each PDF report type.</p>
        <div style={{ marginBottom: 16 }}>
          <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>Report Type</label>
          <select value={selected} onChange={e => setSelected(e.target.value)} className="input">
            {PDF_REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <span style={{ width: 18, height: 18, border: '2px solid var(--line-2)', borderTopColor: 'var(--tx-2)', borderRadius: '50%' }} className="animate-spin" />
          </div>
        ) : tmpl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'title', label: 'Report Title (leave blank to use default)', placeholder: PDF_REPORT_TYPES.find(r=>r.value===selected)?.label },
              { key: 'header_text', label: 'Header Sub-text', placeholder: 'e.g. Confidential — Internal Use Only' },
              { key: 'footer_text', label: 'Footer Text (left side)', placeholder: 'Leave blank to use company address' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="t-label" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
                <input value={tmpl[key] || ''} onChange={set(key)} className="input" placeholder={placeholder} />
              </div>
            ))}

            <div>
              <p className="t-label" style={{ marginBottom: 10 }}>Visibility Toggles</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[
                  { key: 'include_logo',       label: 'Include Logo'   },
                  { key: 'show_address',        label: 'Show Address'   },
                  { key: 'show_page_number',    label: 'Page Number'    },
                  { key: 'show_generated_date', label: 'Generated Date' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={tmpl[key] ?? true} onChange={set(key)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--tx-1)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--tx-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>Company Name</p>
                  <p style={{ fontSize: '0.7rem', color: 'color-mix(in srgb,var(--bg) 70%,transparent)', marginTop: 2 }}>{tmpl.title || PDF_REPORT_TYPES.find(r=>r.value===selected)?.label}</p>
                </div>
                {tmpl.show_generated_date && <p style={{ fontSize: '0.65rem', color: 'color-mix(in srgb,var(--bg) 60%,transparent)' }}>Generated: {new Date().toLocaleDateString('en-IN')}</p>}
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-3)' }}>
                {[1,.8,.6].map((w,i) => <div key={i} style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, width: `${w*100}%`, marginBottom: 6 }} />)}
              </div>
              <div style={{ padding: '6px 14px', background: 'var(--tx-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.65rem', color: 'color-mix(in srgb,var(--bg) 60%,transparent)' }}>{tmpl.footer_text || (tmpl.show_address ? 'Company Address' : '')}</p>
                {tmpl.show_page_number && <p style={{ fontSize: '0.65rem', color: 'color-mix(in srgb,var(--bg) 60%,transparent)' }}>Page 1</p>}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {saving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--accent-inv)', borderRadius: '50%' }} className="animate-spin" /> : <Save size={14} />}
              Save Template
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */
export default function Settings() {
  const [tab, setTab] = useState('company');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="page-enter">
      <div>
        <h1 className="t-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={22} color="var(--tx-2)" />Settings
        </h1>
        <p className="t-body" style={{ marginTop: 2 }}>Customize branding, codes, dropdowns, and PDF templates</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.8125rem', fontWeight: 500, transition: 'all .12s',
              background: active ? 'var(--tx-1)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--tx-2)',
            }}>
              <Icon size={13} />{label}
            </button>
          );
        })}
      </div>

      {tab === 'company' && <CompanyTab />}
      {tab === 'codes'   && <CodesTab />}
      {tab === 'options' && <CustomOptionsTab />}
      {tab === 'pdf'     && <PDFTemplatesTab />}
    </div>
  );
}
