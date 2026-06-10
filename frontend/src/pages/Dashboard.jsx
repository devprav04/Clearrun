import { useState, useMemo } from 'react';
import { CircleCheck, CircleX, CalendarClock, Activity, AlertOctagon, Banknote, Clock, ShieldCheck, Wrench, Package, AlertTriangle, Link2, Calendar, XCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import MaintenanceCalendar from '../components/MaintenanceCalendar';
import TakePartModal from '../components/TakePartModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard, useManagerReport, useInstruments, useCalibration, QK } from '../hooks/queries';
import api from '../api/axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const STAT_CARDS = [
  { key: 'operational',           label: 'Operational',  icon: CircleCheck,   iconColor: 'var(--green)',  cardCls: 'stat-card-green'  },
  { key: 'calibrating',           label: 'Calibrating',  icon: Activity,      iconColor: 'var(--yellow)', cardCls: 'stat-card-yellow' },
  { key: 'broken_down',           label: 'Broken Down',  icon: CircleX,       iconColor: 'var(--red)',    cardCls: 'stat-card-red'    },
  { key: 'scheduled_maintenance', label: 'Scheduled',    icon: CalendarClock, iconColor: 'var(--blue)',   cardCls: 'stat-card-blue'   },
];

const bdSchema = z.object({
  instrument:  z.string().min(1, 'Select an instrument'),
  priority:    z.string(),
  description: z.string().min(5, 'Describe the issue'),
});

const selectCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';

function BreakdownModal({ open, onClose, onSubmit }) {
  const toast = useToast();
  const { data: instruments = [] } = useInstruments();
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(bdSchema),
    defaultValues: { instrument: '', priority: 'medium', description: '' },
  });

  const onSave = async (data) => {
    try {
      await api.post('maintenance/tickets/', data);
      toast('Breakdown ticket submitted.', 'success');
      reset();
      onSubmit(); onClose();
    } catch { toast('Failed to submit.', 'error'); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md bg-[var(--bg-2)] border-[var(--line-2)]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--red) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)' }}>
              <AlertOctagon size={15} color="var(--red)" />
            </div>
            <DialogTitle className="text-[var(--tx-1)]">Report Breakdown</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Instrument *</Label>
            <Controller name="instrument" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Select instrument…" /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  {instruments.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name} — {i.serial_number}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.instrument && <p className="text-xs text-destructive">{errors.instrument.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Priority</Label>
            <Controller name="priority" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="t-label">Description *</Label>
            <Textarea {...register('description')} rows={3} placeholder="Describe the issue…" className="bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-destructive hover:bg-destructive/90">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showBD, setShowBD] = useState(false);
  const [showTP, setShowTP] = useState(false);

  const { data: dash, isLoading: dashLoading } = useDashboard();
  const { data: mgr } = useManagerReport();
  const { data: calibration = [] } = useCalibration();
  const { data: allTickets = [] } = useQuery({
    queryKey: QK.tickets({}),
    queryFn: () => api.get('maintenance/tickets/?page_size=200').then(r => r.data?.results || r.data || []),
    enabled: user?.role === 'technician',
  });

  const tickets = allTickets.filter(x => x.assigned_to === user?.id);

  const refreshDashboard = () => {
    qc.invalidateQueries({ queryKey: QK.dashboard });
    qc.invalidateQueries({ queryKey: QK.tickets({}) });
  };

  const counts    = dash?.instrument_status || dash || {};
  const isManager = user?.role === 'manager' || user?.role === 'admin' || user?.is_superuser;
  const isTech    = user?.role === 'technician';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCalibrations = useMemo(() =>
    calibration.filter(c => c.next_due_date && new Date(c.next_due_date) < today),
    [calibration]
  );

  if (dashLoading) return (
    <div className="flex flex-col gap-6">
      <div className="grid-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer-box" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />)}</div>
      <div className="shimmer-box" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Good day, {user?.first_name || user?.username} 👋</h1>
          <p className="t-body mt-1">Here's what's happening in your lab today.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowTP(true)} className="border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
            <Package size={14} /> Take Part
          </Button>
          <Button onClick={() => setShowBD(true)} variant="destructive">
            <AlertOctagon size={14} /> Report Breakdown
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, iconColor, cardCls }) => (
          <div key={key} className={`stat-card ${cardCls}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="stat-card-icon" style={{
                background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
              }}>
                <Icon size={20} color={iconColor} strokeWidth={2} />
              </div>
            </div>
            <div className="stat-card-value">{counts[key] ?? 0}</div>
            <div className="stat-card-label">{label}</div>
          </div>
        ))}
      </div>

      {dash?.low_stock_parts?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'color-mix(in srgb,var(--orange) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--orange) 20%,transparent)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid color-mix(in srgb,var(--orange) 15%,transparent)' }}>
            <AlertTriangle size={14} color="var(--orange)" />
            <span className="text-sm font-semibold" style={{ color: 'var(--orange)' }}>Low Stock — {dash.low_stock_parts.length} part{dash.low_stock_parts.length > 1 ? 's' : ''} need restocking</span>
          </div>
          {dash.low_stock_parts.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2" style={{ borderBottom: '1px solid color-mix(in srgb,var(--orange) 8%,transparent)' }}>
              <div>
                <p className="text-sm font-medium text-[var(--tx-1)]">{p.name}</p>
                {p.part_number && <p className="t-mono t-small">{p.part_number}</p>}
                {p.instruments?.length > 0 && <p className="text-xs text-[var(--tx-3)] flex items-center gap-1 mt-0.5"><Link2 size={11} />{p.instruments.join(', ')}</p>}
              </div>
              <div className="text-right">
                <span className="badge badge-orange">{p.quantity_in_stock} left</span>
                <p className="t-small mt-0.5">min {p.minimum_stock_level}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {overdueCalibrations.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'color-mix(in srgb,var(--red) 6%,transparent)', border: '1px solid color-mix(in srgb,var(--red) 22%,transparent)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid color-mix(in srgb,var(--red) 15%,transparent)' }}>
            <XCircle size={14} color="var(--red)" />
            <span className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
              {overdueCalibrations.length} calibration{overdueCalibrations.length > 1 ? 's' : ''} overdue
            </span>
          </div>
          {overdueCalibrations.slice(0, 4).map(c => {
            const daysOver = Math.ceil((today - new Date(c.next_due_date)) / 86400000);
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2" style={{ borderBottom: '1px solid color-mix(in srgb,var(--red) 8%,transparent)' }}>
                <p className="text-sm font-medium text-[var(--tx-1)]">{c.instrument_name}</p>
                <span className="badge" style={{ background: 'color-mix(in srgb,var(--red) 12%,transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb,var(--red) 25%,transparent)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 9999, fontWeight: 600 }}>
                  {daysOver}d overdue
                </span>
              </div>
            );
          })}
          {overdueCalibrations.length > 4 && (
            <div className="px-4 py-2 text-xs" style={{ color: 'var(--red)', opacity: .7 }}>
              +{overdueCalibrations.length - 4} more overdue
            </div>
          )}
        </div>
      )}

      {dash?.calibration_due_soon > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: 'color-mix(in srgb,var(--purple) 7%,transparent)', border: '1px solid color-mix(in srgb,var(--purple) 20%,transparent)' }}>
          <Calendar size={14} color="var(--purple)" />
          <p className="text-sm text-[var(--tx-2)]">
            <span className="font-bold text-[var(--tx-1)]">{dash.calibration_due_soon}</span>{' '}
            calibration{dash.calibration_due_soon > 1 ? 's' : ''} due within 30 days
          </p>
        </div>
      )}

      {isManager && mgr && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { icon: Banknote,    label: 'AMC Value',        value: `₹${Number(mgr.active_amc_value || 0).toLocaleString('en-IN')}`, color: 'var(--green)',  cardCls: 'stat-card-green'  },
            { icon: Clock,       label: 'Pending Renewals', value: mgr.amc_pending_renewals ?? '—',                                  color: 'var(--orange)', cardCls: 'stat-card-orange' },
            { icon: ShieldCheck, label: 'Compliance',       value: `${mgr.compliance_percentage ?? '—'}%`,                           color: 'var(--blue)',   cardCls: 'stat-card-blue'   },
          ].map(({ icon: Icon, label, value, color, cardCls }) => (
            <div key={label} className={`stat-card ${cardCls}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="stat-card-label">{label}</span>
                <Icon size={16} color={color} strokeWidth={1.8} />
              </div>
              <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {isTech && (
        <div className="surface overflow-hidden">
          <div className="section-header">
            <Wrench size={16} color="var(--tx-3)" />
            <span className="t-title">My Work Orders</span>
            <span className="badge badge-blue ml-auto">{tickets.length}</span>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Wrench size={22} color="var(--tx-3)" /></div>
              <p className="t-body">No assigned tickets</p>
            </div>
          ) : tickets.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <p className="text-sm font-medium text-[var(--tx-1)]">{t.instrument_name || t.instrument}</p>
                <p className="t-small">{t.description}</p>
              </div>
              <div className="flex gap-1.5">
                <StatusBadge status={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="section-header">
          <Calendar size={16} color="var(--tx-3)" />
          <span className="t-title">Maintenance Calendar</span>
        </div>
        <div style={{ padding: 8 }}>
          <MaintenanceCalendar />
        </div>
      </div>

      <BreakdownModal open={showBD} onClose={() => setShowBD(false)} onSubmit={refreshDashboard} />
      {showTP && <TakePartModal onClose={() => setShowTP(false)} onSuccess={refreshDashboard} />}
    </div>
  );
}
