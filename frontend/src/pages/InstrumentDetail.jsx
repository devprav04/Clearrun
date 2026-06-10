import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FlaskConical, MapPin, Building2,
  QrCode, Wrench, TestTube, FileText, Info, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';

const TABS = [
  { id: 'overview',     label: 'Overview',            icon: Info      },
  { id: 'maintenance',  label: 'Maintenance History', icon: Wrench    },
  { id: 'calibration',  label: 'Calibration Records', icon: TestTube  },
  { id: 'amc',          label: 'AMC Contracts',       icon: FileText  },
];

function Field({ label, value }) {
  return (
    <div>
      <p className="t-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--tx-1)' }}>{value || '—'}</p>
    </div>
  );
}

export default function InstrumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    api.get(`instruments/${id}/`)
      .then(r => setInstrument(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const loadTab = async (tabId) => {
    if (tabData[tabId] || tabId === 'overview') return;
    setTabLoading(true);
    try {
      const endpoints = {
        maintenance: `maintenance/tickets/?instrument=${id}&page_size=100`,
        calibration: `maintenance/calibration/?instrument=${id}&page_size=100`,
        amc:         `maintenance/amc/?instrument=${id}&page_size=100`,
      };
      const r = await api.get(endpoints[tabId]);
      setTabData(prev => ({ ...prev, [tabId]: r.data?.results || r.data || [] }));
    } catch {
      setTabData(prev => ({ ...prev, [tabId]: [] }));
    } finally {
      setTabLoading(false);
    }
  };

  const handleTab = (tabId) => { setTab(tabId); loadTab(tabId); };

  if (loading) return <LoadingSpinner text="Loading instrument..." />;
  if (!instrument) return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <div className="empty-state-icon"><FlaskConical size={22} color="var(--tx-3)" /></div>
      <p className="t-body">Instrument not found</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/instruments')} className="mt-2 border-[var(--line-2)] text-[var(--tx-2)]">
        <ArrowLeft size={13} /> Back to Instruments
      </Button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="outline" size="icon" onClick={() => navigate('/instruments')} className="w-8 h-8 border-[var(--line)] text-[var(--tx-3)] hover:bg-[var(--bg-3)] hover:text-[var(--tx-1)]">
          <ArrowLeft size={15} />
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="t-heading">{instrument.name}</h1>
            <StatusBadge status={instrument.status} />
          </div>
          <p className="t-mono t-small" style={{ marginTop: 2 }}>{instrument.serial_number}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ overflowX: 'auto' }}>
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => handleTab(tabId)} className={`tab-btn${tab === tabId ? ' active' : ''}`}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16 }}>
          <div className="surface" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <FlaskConical size={15} color="var(--blue)" />
              <span className="t-title">Instrument Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Name" value={instrument.name} />
              <Field label="Model" value={instrument.model} />
              <Field label="Serial Number" value={instrument.serial_number} />
              <Field label="Equipment Code" value={instrument.manufacturer} />
              <Field label="Installation Date" value={instrument.installation_date} />
              <Field label="Location" value={instrument.location} />
              <Field label="Vendor" value={instrument.vendor_name || instrument.vendor} />
              <Field label="Category" value={instrument.category} />
              {instrument.notes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p className="t-label" style={{ marginBottom: 4 }}>Notes</p>
                  <p className="t-body">{instrument.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="surface" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <QrCode size={15} color="var(--tx-3)" />
                <span className="t-title">QR Code</span>
              </div>
              {instrument.qr_code ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#fff', padding: 12, borderRadius: 'var(--r-md)', display: 'inline-block' }}>
                    <QRCodeSVG
                      value={instrument.qr_code}
                      size={148}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <p className="t-mono t-small" style={{ textAlign: 'center' }}>{instrument.qr_code}</p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => {
                      const svg = document.querySelector('.qr-svg-container svg');
                      if (!svg) return;
                      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `qr-${instrument.serial_number}.svg`;
                      a.click();
                    }}
                    className="w-full border-[var(--line-2)] text-[var(--tx-2)]"
                  >
                    <Download size={12} /> Download QR
                  </Button>
                </div>
              ) : (
                <div style={{ width: '100%', height: 140, background: 'var(--bg-3)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={40} color="var(--tx-3)" style={{ opacity: .3 }} />
                </div>
              )}
            </div>

            <div className="surface" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Building2 size={15} color="var(--tx-3)" />
                <span className="t-title">Location</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="var(--tx-3)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>{instrument.location || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-overview tab content */}
      {tab !== 'overview' && (
        <div className="surface" style={{ overflow: 'hidden' }}>
          {tabLoading ? (
            <LoadingSpinner text="Loading records..." />
          ) : !tabData[tab] || tabData[tab].length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {tab === 'maintenance' ? <Wrench size={22} color="var(--tx-3)" />
                  : tab === 'calibration' ? <TestTube size={22} color="var(--tx-3)" />
                  : <FileText size={22} color="var(--tx-3)" />}
              </div>
              <p className="t-body">No records found</p>
            </div>
          ) : tab === 'maintenance' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  {['Ticket ID','Priority','Status','Description','Date'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tabData[tab].map(t => (
                    <tr key={t.id}>
                      <td className="t-mono t-small">#{t.id}</td>
                      <td><StatusBadge status={t.priority} /></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                      <td className="t-small">{t.reported_at?.slice(0,10) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tab === 'calibration' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  {['Date','Next Due','Calibrated By','Status','Notes'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tabData[tab].map(c => (
                    <tr key={c.id}>
                      <td>{c.calibration_date || '—'}</td>
                      <td>{c.next_due_date || '—'}</td>
                      <td>{c.calibrated_by_name || '—'}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="t-small" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr>
                  {['Vendor','Type','Start Date','End Date','Value','Status'].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tabData[tab].map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.vendor_name || a.vendor}</td>
                      <td style={{ textTransform: 'capitalize' }}>{(a.contract_type || a.type || '').replace(/_/g,' ')}</td>
                      <td className="t-small">{a.start_date}</td>
                      <td className="t-small">{a.end_date}</td>
                      <td>₹{Number(a.contract_value || 0).toLocaleString('en-IN')}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
