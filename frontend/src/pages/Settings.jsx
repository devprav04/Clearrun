import { useState, useRef, useEffect } from 'react';
import { Settings2, Upload, Building2, Phone, Palette, Save, X, Tag, List, FileText, Plus, Trash2, Type, Layout, Eye } from 'lucide-react';
import api from '../api/axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TABS = [
  { id: 'company', label: 'Company',          Icon: Building2 },
  { id: 'codes',   label: 'Equipment Codes',   Icon: Tag       },
  { id: 'options', label: 'Custom Options',    Icon: List      },
  { id: 'pdf',     label: 'PDF Templates',     Icon: FileText  },
];

const inputCls    = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const textareaCls = 'bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)] resize-none';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface mb-4" style={{ padding: 20 }}>
      <div className="flex items-center gap-2 mb-4">
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
      <Label className="t-label mb-1.5 block">{label}</Label>
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

  const PRESET_COLORS = ['#2563eb','#0ea5e9','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#9333ea'];

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <Section title="Company Logo" icon={Building2}>
        <div className="flex items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-3)', border: '1px dashed var(--line-2)' }}>
            {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" /> : <Building2 size={28} color="var(--tx-3)" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <Button type="button" size="sm" onClick={() => fileRef.current?.click()} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
                <Upload size={12} />{logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {logoPreview && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setLogoFile(null); setLogoPreview(null); }} className="border-destructive/30 text-destructive hover:bg-destructive/10 px-2">
                  <X size={12} />
                </Button>
              )}
            </div>
            <p className="t-small">PNG, JPG, SVG · max 2MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (!f) return; setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }} />
          </div>
        </div>
      </Section>

      <Section title="Organization" icon={Building2}>
        <div className="flex flex-col gap-3.5">
          <Field label="Company / Lab Name *"><Input required value={form.company_name} onChange={set('company_name')} className={inputCls} placeholder="HPCL QC Laboratory" /></Field>
          <Field label="Tagline"><Input value={form.tagline} onChange={set('tagline')} className={inputCls} placeholder="Instrument Management System" /></Field>
          <Field label="Address"><Textarea rows={2} value={form.address} onChange={set('address')} className={textareaCls} /></Field>
        </div>
      </Section>

      <Section title="Contact" icon={Phone}>
        <div className="grid-form gap-3.5">
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="lab@company.com" /></Field>
        </div>
      </Section>

      <Section title="Accent Color" icon={Palette}>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <input type="color" value={form.primary_color} onChange={set('primary_color')} style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0, flexShrink: 0 }} />
            <div>
              <p className="t-mono text-[var(--tx-1)] font-medium">{form.primary_color}</p>
              <p className="t-small">Applied live across the UI</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => { setForm(f => ({ ...f, primary_color: c })); previewColor(c); }}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${form.primary_color === c ? '#fff' : 'transparent'}`, transition: 'transform .12s', transform: form.primary_color === c ? 'scale(1.15)' : 'scale(1)' }} />
            ))}
          </div>
        </div>
      </Section>

      <Button type="submit" disabled={loading} className="w-full max-w-[600px] bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
        Save Settings
      </Button>
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
        <p className="t-body mb-4">
          Codes are auto-generated in the format <span className="t-mono text-[var(--tx-1)]">COMPANY/DEPT/SUBDEPT/TYPE/NUMBER</span>.<br />
          Set your organization's fixed segments below.
        </p>
        <div className="grid-3 mb-4">
          {[
            { key: 'company_code',    label: 'Company Code',    placeholder: 'e.g. CPCL' },
            { key: 'department_code', label: 'Department Code',  placeholder: 'e.g. MAN'  },
            { key: 'sub_dept_code',   label: 'Sub-dept Code',   placeholder: 'e.g. QC'   },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="t-label mb-1.5 block">{label}</Label>
              <Input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value.toUpperCase() }))} className={`${inputCls} font-mono`} placeholder={placeholder} maxLength={20} />
            </div>
          ))}
        </div>

        <div className="rounded-md p-4" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="t-small">Live Preview</p>
            <div className="flex items-center gap-1.5">
              <span className="t-small">Instrument type:</span>
              <Input value={exampleType} onChange={e => setExampleType(e.target.value.toUpperCase())} className="h-7 w-[72px] text-xs font-mono bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]" placeholder="UVF" maxLength={10} />
            </div>
          </div>
          <p className="t-mono font-bold text-[var(--tx-1)] tracking-wide" style={{ fontSize: '1.375rem' }}>{preview}</p>
          <p className="t-small mt-1.5">
            <span className="text-[var(--tx-2)]">Instrument type abbreviation</span> is entered per-instrument when adding a new instrument.
          </p>
        </div>
      </Section>

      <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
        {loading ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={13} />}
        Save Settings
      </Button>
    </form>
  );
}

/* ─── Custom Options Tab ────────────────────────────────────────── */
const FIELD_OPTIONS = [
  { value: 'department',          label: 'Department'           },
  { value: 'location',            label: 'Location / Room'      },
  { value: 'instrument_category', label: 'Instrument Category'  },
  { value: 'maintenance_type',    label: 'Maintenance Type'     },
  { value: 'spare_part_category', label: 'Spare Part Category'  },
];

function CustomOptionsTab() {
  const toast = useToast();
  const [items,       setItems]       = useState([]);
  const [fieldFilter, setFieldFilter] = useState('department');
  const [newLabel,    setNewLabel]    = useState('');
  const [loading,     setLoading]     = useState(false);

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
        <p className="t-body mb-3.5">Add custom values that appear in dropdown menus across the app.</p>
        <div className="mb-3.5">
          <Label className="t-label mb-1.5 block">Field</Label>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
              {FIELD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <form onSubmit={handleAdd} className="flex gap-2 mb-3.5">
          <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={`Add new ${FIELD_OPTIONS.find(o=>o.value===fieldFilter)?.label||'option'}…`} className={`${inputCls} flex-1`} />
          <Button type="submit" disabled={loading || !newLabel.trim()} className="flex-shrink-0 bg-[var(--brand)] hover:bg-[var(--brand-hover)] px-3">
            <Plus size={13} />
          </Button>
        </form>
        <div className="flex flex-col gap-1.5" style={{ maxHeight: 260, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <p className="t-body text-center py-6">No options yet</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-md" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
              <div>
                <p className="text-sm text-[var(--tx-1)]">{item.label}</p>
                <p className="t-mono t-small">{item.value}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─── PDF Templates Tab ─────────────────────────────────────────── */
const PDF_REPORT_TYPES = [
  { value: 'calibration',   label: 'Calibration Report'       },
  { value: 'amc',           label: 'AMC / Contract Report'    },
  { value: 'vendors',       label: 'Vendor List'              },
  { value: 'service_month', label: 'Service Month Report'     },
  { value: 'audit',         label: 'Audit Readiness Report'   },
];

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica (Default)' },
  { value: 'Times',     label: 'Times New Roman'      },
  { value: 'Courier',   label: 'Courier (Monospace)'  },
];

function ColorSwatch({ value, onChange, label }) {
  const id = `cp-${label.replace(/\s/g,'_')}`;
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-9 h-9 flex-shrink-0">
        <div className="w-9 h-9 rounded-md cursor-pointer" style={{ border: '2px solid var(--line-2)', background: value || 'var(--bg-3)' }} onClick={() => document.getElementById(id).click()} />
        <input id={id} type="color" value={value || '#1e3a5f'} onChange={e => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />
      </div>
      <div>
        <p className="text-[0.8125rem] font-medium text-[var(--tx-1)]">{label}</p>
        <p className="t-mono t-small">{value || 'default'}</p>
      </div>
    </div>
  );
}

function CheckToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer select-none" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
      <input type="checkbox" checked={checked ?? false} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--brand)' }} />
      <span className="text-sm text-[var(--tx-2)]">{label}</span>
    </label>
  );
}

function PDFTemplatesTab() {
  const toast = useToast();
  const [selected, setSelected] = useState('calibration');
  const [tmpl,    setTmpl]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`settings/pdf-templates/${selected}/`).then(r => setTmpl(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [selected]);

  const set = k => e => setTmpl(t => ({ ...t, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setVal = (k, v) => setTmpl(t => ({ ...t, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await api.patch(`settings/pdf-templates/${selected}/`, tmpl); toast('Template saved.', 'success'); }
    catch { toast('Failed to save template.', 'error'); }
    finally { setSaving(false); }
  };

  const headerBg   = tmpl?.primary_color || '#1e3a5f';
  const tableAlt   = tmpl?.accent_color  || '#f1f5f9';
  const reportLabel = PDF_REPORT_TYPES.find(r => r.value === selected)?.label || '';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
      <div className="flex flex-col gap-4">
        <div className="surface" style={{ padding: 16 }}>
          <Label className="t-label mb-1.5 block">Report Type</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
              {PDF_REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="surface flex justify-center p-8">
            <span className="w-5 h-5 border-2 border-[var(--line-2)] border-t-[var(--tx-2)] rounded-full animate-spin" />
          </div>
        ) : tmpl && (<>
          <Section title="Header & Footer Text" icon={FileText}>
            {[
              { key: 'title',       label: 'Report Title',     placeholder: reportLabel },
              { key: 'header_text', label: 'Header Sub-text',  placeholder: 'e.g. Confidential — Internal Use Only' },
              { key: 'footer_text', label: 'Footer Text',      placeholder: 'Leave blank to use company address' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="mb-3">
                <Label className="t-label mb-1.5 block">{label}</Label>
                <Input value={tmpl[key] || ''} onChange={set(key)} className={inputCls} placeholder={placeholder} />
              </div>
            ))}
          </Section>

          <Section title="Colors" icon={Palette}>
            <div className="flex flex-col gap-3.5">
              <ColorSwatch label="Header / Footer Background" value={tmpl.primary_color} onChange={v => setVal('primary_color', v)} />
              <ColorSwatch label="Table Alternate Row Color"  value={tmpl.accent_color}  onChange={v => setVal('accent_color',  v)} />
            </div>
          </Section>

          <Section title="Typography" icon={Type}>
            <div className="grid-form gap-3">
              <div>
                <Label className="t-label mb-1.5 block">Font Family</Label>
                <Select value={tmpl.font_family || 'Helvetica'} onValueChange={v => setVal('font_family', v)}>
                  <SelectTrigger className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="t-label mb-1.5 block">Body Font Size (pt)</Label>
                <Input type="number" min={6} max={14} value={tmpl.body_font_size || 8} onChange={set('body_font_size')} className={inputCls} />
              </div>
            </div>
          </Section>

          <Section title="Page Layout" icon={Layout}>
            <div className="grid-form gap-3">
              <div>
                <Label className="t-label mb-1.5 block">Paper Size</Label>
                <Select value={tmpl.paper_size || 'A4'} onValueChange={v => setVal('paper_size', v)}>
                  <SelectTrigger className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">US Letter</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="t-label mb-1.5 block">Orientation</Label>
                <Select value={tmpl.orientation || 'portrait'} onValueChange={v => setVal('orientation', v)}>
                  <SelectTrigger className="h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {[
                { key: 'margin_top',    label: 'Top Margin (mm)',    min: 5, max: 50, def: 20 },
                { key: 'margin_bottom', label: 'Bottom Margin (mm)', min: 5, max: 50, def: 20 },
                { key: 'margin_left',   label: 'Left Margin (mm)',   min: 5, max: 40, def: 15 },
                { key: 'margin_right',  label: 'Right Margin (mm)',  min: 5, max: 40, def: 15 },
              ].map(({ key, label, min, max, def }) => (
                <div key={key}>
                  <Label className="t-label mb-1.5 block">{label}</Label>
                  <Input type="number" min={min} max={max} value={tmpl[key] || def} onChange={set(key)} className={inputCls} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Visibility" icon={Eye}>
            <div className="grid-form gap-2">
              {[
                { key: 'include_logo',            label: 'Include Logo'          },
                { key: 'show_address',             label: 'Show Address'          },
                { key: 'show_page_number',         label: 'Page Numbers'          },
                { key: 'show_generated_date',      label: 'Generated Date'        },
                { key: 'show_table_borders',       label: 'Table Borders'         },
                { key: 'show_alt_row_color',       label: 'Alternating Row Color' },
                { key: 'show_signature_block',     label: 'Signature Block'       },
                { key: 'show_confidential_banner', label: 'Confidential Banner'   },
                { key: 'show_watermark',           label: 'Watermark'             },
              ].map(({ key, label }) => (
                <CheckToggle key={key} checked={tmpl[key]} onChange={v => setVal(key, v)} label={label} />
              ))}
            </div>
            {tmpl.show_watermark && (
              <div className="mt-2.5">
                <Label className="t-label mb-1.5 block">Watermark Text</Label>
                <Input value={tmpl.watermark_text || ''} onChange={set('watermark_text')} className={inputCls} placeholder="DRAFT" />
              </div>
            )}
            {tmpl.show_signature_block && (
              <div className="mt-2.5">
                <Label className="t-label mb-1.5 block">Signature Label</Label>
                <Input value={tmpl.signature_label || ''} onChange={set('signature_label')} className={inputCls} placeholder="Authorised Signatory" />
              </div>
            )}
          </Section>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Save Template
          </Button>
        </>)}
      </div>

      {tmpl && (
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="surface" style={{ padding: 16 }}>
            <p className="t-label mb-3 flex items-center gap-1.5">
              <Eye size={12} color="var(--tx-3)" /> Live Preview
            </p>
            <div style={{ border: '1px solid var(--line-2)', borderRadius: 6, overflow: 'hidden', boxShadow: 'var(--shadow-md)', background: '#fff', fontFamily: tmpl.font_family || 'Helvetica, sans-serif' }}>
              <div style={{ padding: '10px 14px', background: headerBg, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  {tmpl.include_logo && (
                    <div style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Building2 size={14} color="rgba(255,255,255,0.8)" />
                    </div>
                  )}
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#fff', margin: 0 }}>CPCL — Quality Control Lab</p>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{tmpl.title || reportLabel}</p>
                  {tmpl.header_text && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', marginTop: 2, fontStyle: 'italic' }}>{tmpl.header_text}</p>}
                </div>
                {tmpl.show_generated_date && (
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{new Date().toLocaleDateString('en-IN')}</p>
                )}
              </div>
              <div style={{ padding: '10px 14px', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: `${Math.max(6,(tmpl.body_font_size||8)-1)}px` }}>
                  <thead>
                    <tr style={{ background: headerBg }}>
                      {['Instrument','ID','Status','Due Date'].map(h => (
                        <th key={h} style={{ padding: '4px 6px', color: '#fff', textAlign: 'left', fontWeight: 600, border: tmpl.show_table_borders ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[['pH Meter','QC-001','Active','Jun 30'],['Viscometer','QC-002','Due','Jul 15'],['Centrifuge','QC-003','Active','Aug 01']].map((row,i) => (
                      <tr key={i} style={{ background: i%2===1 && tmpl.show_alt_row_color ? tableAlt : '#fff' }}>
                        {row.map((cell,j) => <td key={j} style={{ padding:'3px 6px', color:'#333', border: tmpl.show_table_borders ? '1px solid #e5e7eb' : 'none' }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tmpl.show_signature_block && (
                <div style={{ padding: '6px 14px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: 4, minWidth: 100 }}>
                    <p style={{ fontSize: '0.55rem', color: '#666' }}>{tmpl.signature_label || 'Authorised Signatory'}</p>
                  </div>
                </div>
              )}
              <div style={{ padding: '5px 14px', background: headerBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)' }}>
                  {tmpl.footer_text || (tmpl.show_address ? 'Chennai Petroleum Corporation Limited, Chennai' : '')}
                </p>
                {tmpl.show_page_number && <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>Page 1 of 1</p>}
              </div>
            </div>
            <p className="t-small mt-2.5 text-center">
              {tmpl.paper_size} · {tmpl.orientation} · {tmpl.body_font_size || 8}pt {tmpl.font_family || 'Helvetica'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────── */
export default function Settings() {
  const [tab, setTab] = useState('company');

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div>
        <h1 className="t-heading flex items-center gap-2"><Settings2 size={22} color="var(--tx-2)" />Settings</h1>
        <p className="t-body mt-0.5">Customize branding, codes, dropdowns, and PDF templates</p>
      </div>

      <div className="tab-bar">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-btn${tab === id ? ' active' : ''}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {tab === 'company' && <CompanyTab />}
      {tab === 'codes'   && <CodesTab />}
      {tab === 'options' && <CustomOptionsTab />}
      {tab === 'pdf'     && <PDFTemplatesTab />}
    </div>
  );
}
