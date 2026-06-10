import { useState } from 'react';
import { Wrench, FileText, TestTube, Plus, AlertOctagon, Pencil, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTickets, useAmc, useCalibration, useInstruments, useVendors, useUsers, QK } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TABS = [
  { id: 'tickets',     label: 'Breakdown Tickets', icon: AlertOctagon },
  { id: 'amc',         label: 'AMC Contracts',     icon: FileText     },
  { id: 'calibration', label: 'Calibration',       icon: TestTube     },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

const inputCls  = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
const selectCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';

function FF({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="t-label">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const ticketSchema = z.object({
  instrument:       z.string().min(1, 'Select an instrument'),
  priority:         z.string().default('medium'),
  status:           z.string().default('open'),
  assigned_to:      z.string().optional(),
  description:      z.string().min(3, 'Description is required'),
  resolution_notes: z.string().optional(),
});

function TicketModal({ ticket, onClose, onSuccess }) {
  const editing = Boolean(ticket);
  const toast   = useToast();
  const { data: instruments = [] } = useInstruments();
  const { data: users = [] }       = useUsers();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      instrument:       String(ticket?.instrument      || ''),
      priority:         ticket?.priority               || 'medium',
      status:           ticket?.status                 || 'open',
      assigned_to:      String(ticket?.assigned_to     || ''),
      description:      ticket?.description            || '',
      resolution_notes: ticket?.resolution_notes       || '',
    },
  });

  const onSave = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.assigned_to) delete payload.assigned_to;
      if (editing) await api.patch(`maintenance/tickets/${ticket.id}/`, payload);
      else         await api.post('maintenance/tickets/', payload);
      toast(editing ? 'Ticket updated.' : 'Ticket created.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save ticket.', 'error');
    }
  };

  const techs = users.filter(u => u.role === 'technician');

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2"><AlertOctagon size={16} color="var(--tx-2)" /><DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Ticket' : 'New Breakdown Ticket'}</DialogTitle></div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <FF label="Instrument *" error={errors.instrument?.message}>
            <Controller name="instrument" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Select instrument…" /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  {instruments.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.serial_number})</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FF>
          <div className="grid-form">
            <FF label="Priority">
              <Controller name="priority" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>
            {editing && (
              <FF label="Status">
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                      {['open','assigned','in_progress','resolved','closed'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FF>
            )}
          </div>
          {editing && techs.length > 0 && (
            <FF label="Assign To">
              <Controller name="assigned_to" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="— Unassigned —" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="">— Unassigned —</SelectItem>
                    {techs.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name} ({u.username})</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>
          )}
          <FF label="Description *" error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} placeholder="Describe the issue…" className={`${inputCls} h-auto`} />
          </FF>
          {editing && (
            <FF label="Resolution Notes">
              <Textarea {...register('resolution_notes')} rows={2} placeholder="Steps taken to resolve…" className={`${inputCls} h-auto`} />
            </FF>
          )}
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const amcSchema = z.object({
  instrument:     z.string().min(1, 'Required'),
  vendor:         z.string().min(1, 'Required'),
  contract_type:  z.string().default('comprehensive'),
  status:         z.string().default('active'),
  start_date:     z.string().min(1, 'Required'),
  end_date:       z.string().min(1, 'Required'),
  contract_value: z.coerce.number().min(0),
  notes:          z.string().optional(),
});

function AmcModal({ contract, onClose, onSuccess }) {
  const editing = Boolean(contract);
  const toast   = useToast();
  const { data: instruments = [] } = useInstruments();
  const { data: vendors = [] }     = useVendors();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(amcSchema),
    defaultValues: {
      instrument:     String(contract?.instrument     || ''),
      vendor:         String(contract?.vendor         || ''),
      contract_type:  contract?.contract_type         || 'comprehensive',
      status:         contract?.status                || 'active',
      start_date:     contract?.start_date            || '',
      end_date:       contract?.end_date              || '',
      contract_value: contract?.contract_value        || '',
      notes:          contract?.notes                 || '',
    },
  });

  const onSave = async (data) => {
    try {
      if (editing) await api.patch(`maintenance/amc/${contract.id}/`, data);
      else         await api.post('maintenance/amc/', data);
      toast(editing ? 'Contract updated.' : 'Contract added.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2"><FileText size={16} color="var(--tx-2)" /><DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit AMC Contract' : 'New AMC Contract'}</DialogTitle></div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <div className="grid-form">
            <FF label="Instrument *" error={errors.instrument?.message}>
              <Controller name="instrument" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    {instruments.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Vendor *" error={errors.vendor?.message}>
              <Controller name="vendor" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Contract Type">
              <Controller name="contract_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="non_comprehensive">Non-Comprehensive</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Status">
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending_renewal">Pending Renewal</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Start Date *" error={errors.start_date?.message}>
              <Input {...register('start_date')} type="date" className={inputCls} />
            </FF>
            <FF label="End Date *" error={errors.end_date?.message}>
              <Input {...register('end_date')} type="date" className={inputCls} />
            </FF>
            <div className="flex flex-col gap-1.5" style={{ gridColumn: 'span 2' }}>
              <FF label="Contract Value (₹) *" error={errors.contract_value?.message}>
                <Input {...register('contract_value')} type="number" min="0" step="0.01" placeholder="e.g. 250000" className={inputCls} />
              </FF>
            </div>
          </div>
          <FF label="Notes">
            <Textarea {...register('notes')} rows={2} placeholder="Optional notes…" className={`${inputCls} h-auto`} />
          </FF>
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Add Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const calSchema = z.object({
  instrument:        z.string().min(1, 'Required'),
  calibration_date:  z.string().min(1, 'Required'),
  next_due_date:     z.string().min(1, 'Required'),
  status:            z.string().default('valid'),
  notes:             z.string().optional(),
});

function CalibrationModal({ record, onClose, onSuccess }) {
  const editing = Boolean(record);
  const toast   = useToast();
  const { data: instruments = [] } = useInstruments();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(calSchema),
    defaultValues: {
      instrument:       String(record?.instrument       || ''),
      calibration_date: record?.calibration_date        || '',
      next_due_date:    record?.next_due_date            || '',
      status:           record?.status                  || 'valid',
      notes:            record?.notes                   || '',
    },
  });

  const onSave = async (data) => {
    try {
      if (editing) await api.patch(`maintenance/calibration/${record.id}/`, data);
      else         await api.post('maintenance/calibration/', data);
      toast(editing ? 'Record updated.' : 'Record added.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[var(--bg-2)] border-[var(--line-2)]">
        <DialogHeader>
          <div className="flex items-center gap-2"><TestTube size={16} color="var(--tx-2)" /><DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Calibration Record' : 'New Calibration Record'}</DialogTitle></div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          <FF label="Instrument *" error={errors.instrument?.message}>
            <Controller name="instrument" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue placeholder="Select instrument…" /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  {instruments.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.serial_number})</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FF>
          <div className="grid-form">
            <FF label="Calibration Date *" error={errors.calibration_date?.message}>
              <Input {...register('calibration_date')} type="date" className={inputCls} />
            </FF>
            <FF label="Next Due Date *" error={errors.next_due_date?.message}>
              <Input {...register('next_due_date')} type="date" className={inputCls} />
            </FF>
          </div>
          <FF label="Status">
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </FF>
          <FF label="Notes">
            <Textarea {...register('notes')} rows={2} placeholder="Optional notes…" className={`${inputCls} h-auto`} />
          </FF>
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Add Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CrudTable({ rows, columns, emptyIcon: Icon, emptyText, isAdmin, onEdit, onDelete }) {
  if (!rows.length) return (
    <div className="surface">
      <div className="empty-state">
        <div className="empty-state-icon"><Icon size={22} color="var(--tx-3)" /></div>
        <p className="t-body">{emptyText}</p>
      </div>
    </div>
  );
  return (
    <div className="surface overflow-hidden">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(c => <th key={c.label}>{c.label}</th>)}
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {columns.map(c => <td key={c.label}>{c.render(row)}</td>)}
                {isAdmin && (
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => onEdit(row)} className="px-2 border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]"><Pencil size={12} /></Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(row)} className="px-2 border-destructive/30 text-destructive hover:bg-destructive/10"><Trash2 size={12} /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Maintenance() {
  const { user } = useAuth();
  const toast    = useToast();
  const qc       = useQueryClient();
  const isAdmin  = user?.role === 'manager';
  const [tab,          setTab]          = useState('tickets');
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: tickets     = [], isLoading: tLoading } = useTickets();
  const { data: amc         = [], isLoading: aLoading } = useAmc();
  const { data: calibration = [], isLoading: cLoading } = useCalibration();
  const loading = tLoading || aLoading || cLoading;

  const handleDelete = async () => {
    const { type, id } = deleteTarget;
    const ep = { ticket: `maintenance/tickets/${id}/`, amc: `maintenance/amc/${id}/`, cal: `maintenance/calibration/${id}/` };
    try {
      await api.delete(ep[type]);
      toast('Record deleted.', 'success');
      setDeleteTarget(null);
      if (type === 'ticket') qc.invalidateQueries({ queryKey: QK.tickets() });
      if (type === 'amc')    qc.invalidateQueries({ queryKey: QK.amc });
      if (type === 'cal')    qc.invalidateQueries({ queryKey: QK.calibration });
    } catch { toast('Failed to delete.', 'error'); }
  };

  const tabData = { tickets, amc, calibration };
  const addActions = {
    tickets:     { label: 'New Ticket',   action: () => setModal({ type: 'ticket' }) },
    amc:         { label: 'Add Contract', action: () => setModal({ type: 'amc' })    },
    calibration: { label: 'Add Record',   action: () => setModal({ type: 'cal' })    },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Maintenance Hub</h1>
          <p className="t-body mt-0.5">Manage tickets, AMC contracts and calibration</p>
        </div>
        {isAdmin && (
          <Button onClick={addActions[tab].action} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            <Plus size={13} />{addActions[tab].label}
          </Button>
        )}
      </div>

      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count  = tabData[id]?.length || 0;
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className={`tab-btn${active ? ' active' : ''}`}>
              <Icon size={13} />
              {label}
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 9999, background: active ? 'color-mix(in srgb,var(--brand) 15%,transparent)' : 'var(--bg-4)', color: active ? 'var(--brand)' : 'var(--tx-3)' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="shimmer-box" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
      ) : (
        <>
          {tab === 'tickets' && (
            <CrudTable rows={tickets} emptyIcon={AlertOctagon} emptyText="No breakdown tickets found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'ticket', record: r })}
              onDelete={r => setDeleteTarget({ type: 'ticket', id: r.id, name: `Ticket #${r.id}` })}
              columns={[
                { label: '#',           render: r => <span className="t-mono t-small">#{r.id}</span> },
                { label: 'Instrument',  render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name || r.instrument}</span> },
                { label: 'Priority',    render: r => <StatusBadge status={r.priority} /> },
                { label: 'Status',      render: r => <StatusBadge status={r.status} /> },
                { label: 'Assigned To', render: r => <span>{r.assigned_to_name || '—'}</span> },
                { label: 'Description', render: r => <span className="t-body block max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">{r.description}</span> },
                { label: 'Reported',    render: r => <span className="t-small">{r.reported_at?.slice(0,10) || '—'}</span> },
              ]}
            />
          )}
          {tab === 'amc' && (
            <CrudTable rows={amc} emptyIcon={FileText} emptyText="No AMC contracts found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'amc', record: r })}
              onDelete={r => setDeleteTarget({ type: 'amc', id: r.id, name: `AMC for ${r.instrument_name}` })}
              columns={[
                { label: 'Instrument', render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Vendor',     render: r => <span>{r.vendor_name}</span> },
                { label: 'Type',       render: r => <span className="capitalize">{r.contract_type?.replace(/_/g,' ')}</span> },
                { label: 'Start',      render: r => <span className="t-small">{r.start_date}</span> },
                { label: 'End',        render: r => <span className="t-small">{r.end_date}</span> },
                { label: 'Value',      render: r => <span>₹{Number(r.contract_value||0).toLocaleString('en-IN')}</span> },
                { label: 'Expiry',     render: r => { const d = daysUntil(r.end_date); return <span style={{ fontWeight: 600, color: d < 0 ? 'var(--red)' : d < 30 ? 'var(--orange)' : 'var(--tx-1)' }}>{d < 0 ? `Expired ${Math.abs(d)}d ago` : `${d}d`}</span>; } },
                { label: 'Status',     render: r => <StatusBadge status={r.status} /> },
              ]}
            />
          )}
          {tab === 'calibration' && (
            <CrudTable rows={calibration} emptyIcon={TestTube} emptyText="No calibration records found" isAdmin={isAdmin}
              onEdit={r => setModal({ type: 'cal', record: r })}
              onDelete={r => setDeleteTarget({ type: 'cal', id: r.id, name: `Calibration for ${r.instrument_name}` })}
              columns={[
                { label: 'Instrument',    render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Date',          render: r => <span>{r.calibration_date}</span> },
                { label: 'Next Due',      render: r => { const d = daysUntil(r.next_due_date); return <span style={{ color: d !== null && d < 30 ? 'var(--orange)' : 'var(--tx-1)', fontWeight: d !== null && d < 30 ? 600 : 400 }}>{r.next_due_date || '—'}</span>; } },
                { label: 'Calibrated By', render: r => <span>{r.calibrated_by_name || '—'}</span> },
                { label: 'Status',        render: r => <StatusBadge status={r.status} /> },
                { label: 'Notes',         render: r => <span className="t-small">{r.notes || '—'}</span> },
              ]}
            />
          )}
        </>
      )}

      {modal?.type === 'ticket' && <TicketModal     ticket={modal.record}   onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.tickets() })} />}
      {modal?.type === 'amc'    && <AmcModal         contract={modal.record} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.amc })} />}
      {modal?.type === 'cal'    && <CalibrationModal record={modal.record}   onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.calibration })} />}
      {deleteTarget && <ConfirmDialog title="Confirm Delete" message={`Delete "${deleteTarget.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
