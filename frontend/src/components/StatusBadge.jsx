const STATUS_MAP = {
  operational:            { label: 'Operational',      cls: 'badge-green' },
  calibrating:            { label: 'Calibrating',      cls: 'badge-yellow' },
  broken_down:            { label: 'Broken Down',      cls: 'badge-red' },
  out_of_service:         { label: 'Out of Service',   cls: 'badge-red' },
  scheduled_maintenance:  { label: 'Scheduled',        cls: 'badge-blue' },
  active:                 { label: 'Active',           cls: 'badge-green' },
  expired:                { label: 'Expired',          cls: 'badge-red' },
  expiring_soon:          { label: 'Expiring Soon',    cls: 'badge-orange' },
  open:                   { label: 'Open',             cls: 'badge-blue' },
  in_progress:            { label: 'In Progress',      cls: 'badge-yellow' },
  resolved:               { label: 'Resolved',         cls: 'badge-green' },
  closed:                 { label: 'Closed',           cls: 'badge-slate' },
  low:                    { label: 'Low',              cls: 'badge-slate' },
  medium:                 { label: 'Medium',           cls: 'badge-yellow' },
  high:                   { label: 'High',             cls: 'badge-orange' },
  critical:               { label: 'Critical',         cls: 'badge-red' },
  passed:                 { label: 'Passed',           cls: 'badge-green' },
  failed:                 { label: 'Failed',           cls: 'badge-red' },
  due:                    { label: 'Due',              cls: 'badge-orange' },
  manager:                { label: 'Manager',          cls: 'badge-purple' },
  technician:             { label: 'Technician',       cls: 'badge-blue' },
  employee:               { label: 'Employee',         cls: 'badge-slate' },
};

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase().replace(/ /g, '_');
  const config = STATUS_MAP[key] || { label: status || 'Unknown', cls: 'badge-slate' };
  return <span className={`badge ${config.cls}`}>{config.label}</span>;
}
