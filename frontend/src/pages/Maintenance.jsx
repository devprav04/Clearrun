import { useState } from 'react';
import { Wrench, FileText, TestTube, Plus, AlertOctagon, Pencil, Trash2, ScrollText, FileDown, CalendarDays, List } from 'lucide-react';
import { exportCSV } from '../utils/csvExport';
import MaintenanceCalendar from '../components/MaintenanceCalendar';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTickets, useAmc, useCalibration, useLogs, useInstruments, useVendors, useUsers, QK } from '../hooks/queries';
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
  { id: 'logs',        label: 'Service Logs',      icon: ScrollText   },
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

/* ─── Ticket Modal ─────────────────────────────────────────────── */
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

/* ─── AMC Modal (fixed: instrument_id / vendor_id) ────────────── */
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
      instrument:     String(contract?.instrument_id   || contract?.instrument || ''),
      vendor:         String(contract?.vendor_id       || contract?.vendor     || ''),
      contract_type:  contract?.contract_type          || 'comprehensive',
      status:         contract?.status                 || 'active',
      start_date:     contract?.start_date             || '',
      end_date:       contract?.end_date               || '',
      contract_value: contract?.contract_value         || '',
      notes:          contract?.notes                  || '',
    },
  });

  const onSave = async (data) => {
    try {
      const { instrument, vendor, ...rest } = data;
      const payload = { ...rest, instrument_id: Number(instrument), vendor_id: Number(vendor) };
      if (editing) await api.patch(`maintenance/amc/${contract.id}/`, rest);
      else         await api.post('maintenance/amc/', payload);
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
            <div style={{ gridColumn: 'span 2' }}>
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

/* ─── Calibration Modal ────────────────────────────────────────── */
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

/* ─── Maintenance Log Modal ────────────────────────────────────── */
const logSchema = z.object({
  instrument:           z.string().min(1, 'Required'),
  maintenance_type:     z.string().min(1, 'Required'),
  description:          z.string().min(3, 'Required'),
  performed_at:         z.string().min(1, 'Required'),
  parts_used:           z.string().optional(),
  labor_cost:           z.coerce.number().min(0).default(0),
  parts_cost:           z.coerce.number().min(0).default(0),
  next_maintenance_due: z.string().optional(),
});

function LogModal({ log, onClose, onSuccess }) {
  const editing = Boolean(log);
  const toast   = useToast();
  const { data: instruments = [] } = useInstruments();

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(logSchema),
    defaultValues: {
      instrument:           String(log?.instrument_id || ''),
      maintenance_type:     log?.maintenance_type     || 'corrective',
      description:          log?.description          || '',
      performed_at:         log?.performed_at?.slice(0,16) || new Date().toISOString().slice(0,16),
      parts_used:           log?.parts_used           || '',
      labor_cost:           log?.labor_cost           || 0,
      parts_cost:           log?.parts_cost           || 0,
      next_maintenance_due: log?.next_maintenance_due || '',
    },
  });

  const onSave = async (data) => {
    try {
      if (editing) {
        const { instrument, ...rest } = data;
        await api.patch(`maintenance/logs/${log.id}/`, rest);
      } else {
        await api.post('maintenance/logs/', data);
      }
      toast(editing ? 'Log updated.' : 'Log created.', 'success');
      onSuccess(); onClose();
    } catch (err) {
      toast(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.', 'error');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[var(--bg-2)] border-[var(--line-2)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2"><ScrollText size={16} color="var(--tx-2)" /><DialogTitle className="text-[var(--tx-1)]">{editing ? 'Edit Service Log' : 'New Service Log'}</DialogTitle></div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-3">
          {!editing && (
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
          )}
          <div className="grid-form">
            <FF label="Maintenance Type *" error={errors.maintenance_type?.message}>
              <Controller name="maintenance_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={selectCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="overhaul">Overhaul</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FF>
            <FF label="Performed At *" error={errors.performed_at?.message}>
              <Input {...register('performed_at')} type="datetime-local" className={inputCls} />
            </FF>
          </div>
          <FF label="Description *" error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} placeholder="Describe the work performed…" className={`${inputCls} h-auto`} />
          </FF>
          <FF label="Parts Used">
            <Input {...register('parts_used')} placeholder="e.g. Filter X-22, O-ring 5mm" className={inputCls} />
          </FF>
          <div className="grid-form">
            <FF label="Labour Cost (₹)">
              <Input {...register('labor_cost')} type="number" min="0" step="0.01" placeholder="0" className={inputCls} />
            </FF>
            <FF label="Parts Cost (₹)">
              <Input {...register('parts_cost')} type="number" min="0" step="0.01" placeholder="0" className={inputCls} />
            </FF>
          </div>
          <FF label="Next Maintenance Due">
            <Input {...register('next_maintenance_due')} type="date" className={inputCls} />
          </FF>
          <DialogFooter className="gap-2 sm:gap-2 mt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--line-2)] text-[var(--tx-2)]">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {editing ? 'Save Changes' : 'Save Log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Reusable CRUD table ──────────────────────────────────────── */
function CrudTable({ rows, columns, emptyIcon: Icon, emptyText, emptySubtext, isAdmin, onEdit, onDelete, onAdd, addLabel, exportFilename, exportColumns }) {
  if (!rows.length) return (
    <div className="surface">
      <div className="empty-state">
        <div className="empty-state-icon"><Icon size={26} color="var(--tx-3)" /></div>
        <p className="t-body" style={{ fontWeight: 500 }}>{emptyText}</p>
        {emptySubtext && <p className="t-small mt-1" style={{ maxWidth: 260, textAlign: 'center' }}>{emptySubtext}</p>}
        {isAdmin && onAdd && (
          <Button onClick={onAdd} size="sm" className="mt-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
            <Plus size={13} />{addLabel || 'Add Record'}
          </Button>
        )}
      </div>
    </div>
  );
  return (
    <div className="surface overflow-hidden">
      {exportFilename && exportColumns && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
          <Button variant="outline" size="sm" onClick={() => exportCSV(exportFilename, rows, exportColumns)} className="border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)] gap-1.5">
            <FileDown size={12} />Export CSV
          </Button>
        </div>
      )}
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

/* ─── Page ─────────────────────────────────────────────────────── */
export default function Maintenance() {
  const { user } = useAuth();
  const toast    = useToast();
  const qc       = useQueryClient();
  const isAdmin  = user?.role === 'manager' || user?.role === 'admin' || user?.is_superuser;
  const [tab,          setTab]          = useState('tickets');
  const [viewMode,     setViewMode]     = useState('table');
  const [modal,        setModal]        = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: tickets     = [], isLoading: tLoading } = useTickets();
  const { data: amc         = [], isLoading: aLoading } = useAmc();
  const { data: calibration = [], isLoading: cLoading } = useCalibration();
  const { data: logs        = [], isLoading: lLoading } = useLogs();
  const loading = tLoading || aLoading || cLoading || lLoading;

  const handleDelete = async () => {
    const { type, id } = deleteTarget;
    const ep = {
      ticket: `maintenance/tickets/${id}/`,
      amc:    `maintenance/amc/${id}/`,
      cal:    `maintenance/calibration/${id}/`,
      log:    `maintenance/logs/${id}/`,
    };
    try {
      await api.delete(ep[type]);
      toast('Record deleted.', 'success');
      setDeleteTarget(null);
      if (type === 'ticket') qc.invalidateQueries({ queryKey: QK.tickets() });
      if (type === 'amc')    qc.invalidateQueries({ queryKey: QK.amc });
      if (type === 'cal')    qc.invalidateQueries({ queryKey: QK.calibration });
      if (type === 'log')    qc.invalidateQueries({ queryKey: QK.logs() });
    } catch { toast('Failed to delete.', 'error'); }
  };

  const tabCounts = { tickets: tickets.length, amc: amc.length, calibration: calibration.length, logs: logs.length };
  const addActions = {
    tickets:     { label: 'New Ticket',   action: () => setModal({ type: 'ticket' }) },
    amc:         { label: 'Add Contract', action: () => setModal({ type: 'amc' })    },
    calibration: { label: 'Add Record',   action: () => setModal({ type: 'cal' })    },
    logs:        { label: 'Log Service',  action: () => setModal({ type: 'log' })    },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1 className="t-heading">Maintenance Hub</h1>
          <p className="t-body mt-0.5">Manage tickets, AMC contracts, calibration and service logs</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Calendar / table toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {[['table', List, 'Table'], ['calendar', CalendarDays, 'Calendar']].map(([mode, Icon, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={label} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                background: viewMode === mode ? 'var(--brand)' : 'var(--bg-2)',
                color: viewMode === mode ? '#fff' : 'var(--tx-2)',
                border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500,
                transition: 'all .12s',
              }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
          {isAdmin && viewMode === 'table' && (
            <Button onClick={addActions[tab].action} className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
              <Plus size={13} />{addActions[tab].label}
            </Button>
          )}
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count  = tabCounts[id] || 0;
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

      {viewMode === 'calendar' ? (
        <div className="surface overflow-hidden" style={{ padding: 8 }}>
          <MaintenanceCalendar />
        </div>
      ) : loading ? (
        <div className="shimmer-box" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
      ) : (
        <>
          {tab === 'tickets' && (
            <CrudTable rows={tickets} emptyIcon={AlertOctagon} emptyText="No breakdown tickets yet" emptySubtext="Breakdown tickets are created when an instrument fails and needs urgent attention." isAdmin={isAdmin}
              onAdd={addActions.tickets.action} addLabel="New Ticket"
              exportFilename={`tickets_${new Date().toISOString().slice(0,10)}.csv`}
              exportColumns={[
                { label: 'ID',          getValue: r => r.id },
                { label: 'Instrument',  getValue: r => r.instrument_name || r.instrument },
                { label: 'Priority',    getValue: r => r.priority },
                { label: 'Status',      getValue: r => r.status },
                { label: 'Assigned To', getValue: r => r.assigned_to_name || '' },
                { label: 'Description', getValue: r => r.description },
                { label: 'Reported',    getValue: r => r.reported_at?.slice(0,10) || '' },
              ]}
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
            <CrudTable rows={amc} emptyIcon={FileText} emptyText="No AMC contracts yet" emptySubtext="Add Annual Maintenance Contracts to track vendor service agreements and renewal dates." isAdmin={isAdmin}
              onAdd={addActions.amc.action} addLabel="Add Contract"
              exportFilename={`amc_contracts_${new Date().toISOString().slice(0,10)}.csv`}
              exportColumns={[
                { label: 'Instrument',    getValue: r => r.instrument_name },
                { label: 'Vendor',        getValue: r => r.vendor_name },
                { label: 'Type',          getValue: r => r.contract_type?.replace(/_/g,' ') },
                { label: 'Start Date',    getValue: r => r.start_date },
                { label: 'End Date',      getValue: r => r.end_date },
                { label: 'Value (INR)',   getValue: r => r.contract_value || 0 },
                { label: 'Status',        getValue: r => r.status },
              ]}
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
            <CrudTable rows={calibration} emptyIcon={TestTube} emptyText="No calibration records yet" emptySubtext="Track instrument calibrations, certificates and next due dates to stay compliant." isAdmin={isAdmin}
              onAdd={addActions.calibration.action} addLabel="Add Record"
              exportFilename={`calibration_${new Date().toISOString().slice(0,10)}.csv`}
              exportColumns={[
                { label: 'Instrument',    getValue: r => r.instrument_name },
                { label: 'Date',          getValue: r => r.calibration_date },
                { label: 'Next Due',      getValue: r => r.next_due_date || '' },
                { label: 'Calibrated By', getValue: r => r.calibrated_by_name || '' },
                { label: 'Status',        getValue: r => r.status },
                { label: 'Notes',         getValue: r => r.notes || '' },
              ]}
              onEdit={r => setModal({ type: 'cal', record: r })}
              onDelete={r => setDeleteTarget({ type: 'cal', id: r.id, name: `Calibration for ${r.instrument_name}` })}
              columns={[
                { label: 'Instrument',    render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Date',          render: r => <span>{r.calibration_date}</span> },
                { label: 'Next Due',      render: r => { const d = daysUntil(r.next_due_date); return <span style={{ color: d !== null && d < 0 ? 'var(--red)' : d !== null && d < 30 ? 'var(--orange)' : 'var(--tx-1)', fontWeight: d !== null && d < 30 ? 600 : 400 }}>{r.next_due_date || '—'}{d !== null && d < 0 ? ' ⚠ overdue' : ''}</span>; } },
                { label: 'Calibrated By', render: r => <span>{r.calibrated_by_name || '—'}</span> },
                { label: 'Status',        render: r => <StatusBadge status={r.status} /> },
                { label: 'Notes',         render: r => <span className="t-small">{r.notes || '—'}</span> },
              ]}
            />
          )}
          {tab === 'logs' && (
            <CrudTable rows={logs} emptyIcon={ScrollText} emptyText="No service logs yet" emptySubtext="Log every service visit, repair or preventive maintenance activity for a full audit trail." isAdmin={isAdmin}
              onAdd={addActions.logs.action} addLabel="Log Service"
              exportFilename={`service_logs_${new Date().toISOString().slice(0,10)}.csv`}
              exportColumns={[
                { label: 'Instrument',   getValue: r => r.instrument_name },
                { label: 'Type',         getValue: r => r.maintenance_type?.replace(/_/g,' ') },
                { label: 'Description',  getValue: r => r.description },
                { label: 'Performed By', getValue: r => r.performed_by_name || '' },
                { label: 'Date',         getValue: r => r.performed_at?.slice(0,10) || '' },
                { label: 'Labour (INR)', getValue: r => r.labor_cost || 0 },
                { label: 'Parts (INR)',  getValue: r => r.parts_cost || 0 },
                { label: 'Next Due',     getValue: r => r.next_maintenance_due || '' },
              ]}
              onEdit={r => setModal({ type: 'log', record: r })}
              onDelete={r => setDeleteTarget({ type: 'log', id: r.id, name: `Log #${r.id}` })}
              columns={[
                { label: 'Instrument',  render: r => <span style={{ fontWeight: 500 }}>{r.instrument_name}</span> },
                { label: 'Type',        render: r => <span className="capitalize">{r.maintenance_type?.replace(/_/g,' ')}</span> },
                { label: 'Description', render: r => <span className="t-body block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">{r.description}</span> },
                { label: 'Performed By',render: r => <span>{r.performed_by_name || '—'}</span> },
                { label: 'Date',        render: r => <span className="t-small">{r.performed_at?.slice(0,10) || '—'}</span> },
                { label: 'Labour',      render: r => <span>₹{Number(r.labor_cost||0).toLocaleString('en-IN')}</span> },
                { label: 'Parts',       render: r => <span>₹{Number(r.parts_cost||0).toLocaleString('en-IN')}</span> },
                { label: 'Next Due',    render: r => <span className="t-small">{r.next_maintenance_due || '—'}</span> },
              ]}
            />
          )}
        </>
      )}

      {modal?.type === 'ticket' && <TicketModal     ticket={modal.record}   onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.tickets() })} />}
      {modal?.type === 'amc'    && <AmcModal         contract={modal.record} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.amc })} />}
      {modal?.type === 'cal'    && <CalibrationModal record={modal.record}   onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.calibration })} />}
      {modal?.type === 'log'    && <LogModal         log={modal.record}      onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: QK.logs() })} />}
      {deleteTarget && <ConfirmDialog title="Confirm Delete" message={`Delete "${deleteTarget.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
