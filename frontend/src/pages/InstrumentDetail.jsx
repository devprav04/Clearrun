import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FlaskConical, MapPin, Hash, Calendar, Building2,
  QrCode, Wrench, TestTube, FileText, Info
} from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'maintenance', label: 'Maintenance History', icon: Wrench },
  { id: 'calibration', label: 'Calibration Records', icon: TestTube },
  { id: 'amc', label: 'AMC Contracts', icon: FileText },
];

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-white font-medium">{value || '—'}</p>
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
      .then((r) => setInstrument(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const loadTab = async (tabId) => {
    if (tabData[tabId] || tabId === 'overview') return;
    setTabLoading(true);
    try {
      let endpoint = '';
      if (tabId === 'maintenance') endpoint = `maintenance/tickets/?instrument=${id}`;
      if (tabId === 'calibration') endpoint = `maintenance/calibration/?instrument=${id}`;
      if (tabId === 'amc') endpoint = `maintenance/amc/?instrument=${id}`;
      const r = await api.get(endpoint);
      setTabData((prev) => ({ ...prev, [tabId]: r.data?.results || r.data || [] }));
    } catch {
      setTabData((prev) => ({ ...prev, [tabId]: [] }));
    } finally {
      setTabLoading(false);
    }
  };

  const handleTab = (tabId) => {
    setTab(tabId);
    loadTab(tabId);
  };

  if (loading) return <LoadingSpinner text="Loading instrument..." />;
  if (!instrument) return (
    <div className="text-center py-20 text-slate-400">Instrument not found</div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/instruments')} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{instrument.name}</h1>
            <StatusBadge status={instrument.status} />
          </div>
          <p className="text-slate-400 text-sm mt-0.5 font-mono">{instrument.serial_number}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700 overflow-x-auto">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => handleTab(tabId)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === tabId
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main details */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-blue-400" />
              Instrument Details
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Name" value={instrument.name} />
              <Field label="Model" value={instrument.model} />
              <Field label="Serial Number" value={instrument.serial_number} />
              <Field label="Manufacturer" value={instrument.manufacturer} />
              <Field label="Installation Date" value={instrument.installation_date} />
              <Field label="Location" value={instrument.location} />
              <Field label="Vendor" value={instrument.vendor || instrument.vendor_name} />
              <Field label="Category" value={instrument.category} />
              {instrument.description && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-0.5">Description</p>
                  <p className="text-sm text-slate-300">{instrument.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR code / status */}
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-400" />
                QR Code
              </h2>
              {instrument.qr_code ? (
                <img src={instrument.qr_code} alt="QR Code" className="w-full max-w-[180px] mx-auto rounded-lg" />
              ) : (
                <div className="w-full h-40 bg-slate-900 rounded-xl flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-600" />
                </div>
              )}
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Location
              </h2>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{instrument.location || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab !== 'overview' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {tabLoading ? (
            <LoadingSpinner text="Loading records..." />
          ) : !tabData[tab] || tabData[tab].length === 0 ? (
            <div className="text-center py-16 text-slate-500">No records found</div>
          ) : tab === 'maintenance' ? (
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  {['Ticket ID', 'Priority', 'Status', 'Description', 'Date'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tabData[tab].map((t) => (
                  <tr key={t.id} className="hover:bg-slate-700/30">
                    <td className="px-5 py-3 text-slate-300 text-sm font-mono">#{t.id}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.priority} /></td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3 text-slate-300 text-sm max-w-xs truncate">{t.description}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{t.reported_at?.slice(0, 10) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'calibration' ? (
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  {['Date', 'Next Due', 'Technician', 'Status', 'Notes'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tabData[tab].map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30">
                    <td className="px-5 py-3 text-slate-300 text-sm">{c.calibration_date || '—'}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">{c.next_due_date || '—'}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">{c.calibrated_by_name || '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-slate-400 text-sm max-w-xs truncate">{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  {['Vendor', 'Type', 'Start Date', 'End Date', 'Value', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tabData[tab].map((a) => (
                  <tr key={a.id} className="hover:bg-slate-700/30">
                    <td className="px-5 py-3 text-slate-300 text-sm">{a.vendor_name || a.vendor}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">{a.contract_type || a.type}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">{a.start_date}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">{a.end_date}</td>
                    <td className="px-5 py-3 text-slate-300 text-sm">₹{Number(a.contract_value || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
