import { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuditLog, useUsers } from '../hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const ACTION_COLORS = {
  create:   'var(--green)',
  update:   'var(--blue)',
  delete:   'var(--red)',
  login:    'var(--purple)',
  logout:   'var(--tx-3)',
  checkout: 'var(--yellow)',
  ticket:   'var(--orange)',
};

const ACTION_LABELS = {
  create: 'Created', update: 'Updated', delete: 'Deleted',
  login: 'Logged In', logout: 'Logged Out', checkout: 'Part Taken', ticket: 'Ticket',
};

const ACTION_OPTIONS = [
  { value: 'all',      label: 'All Actions'       },
  { value: 'create',   label: 'Created'            },
  { value: 'update',   label: 'Updated'            },
  { value: 'delete',   label: 'Deleted'            },
  { value: 'login',    label: 'Logged In'          },
  { value: 'logout',   label: 'Logged Out'         },
  { value: 'checkout', label: 'Part Taken'         },
  { value: 'ticket',   label: 'Ticket Reported'    },
];

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || 'var(--tx-3)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--r-sm)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: `color-mix(in srgb,${color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${color} 20%,transparent)` }}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AuditLog() {
  const [search, setSearch]           = useState('');
  const [filterUser, setFilterUser]   = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 25;

  const auditParams = {
    search:    search        || undefined,
    user:      filterUser   !== 'all' ? filterUser   : undefined,
    action:    filterAction !== 'all' ? filterAction : undefined,
    page,
    page_size: PAGE_SIZE,
  };
  const { data: auditData, isLoading: loading, refetch } = useAuditLog(auditParams);
  const { data: users = [] } = useUsers();

  const logs  = auditData?.results ?? auditData ?? [];
  const total = auditData?.count   ?? logs.length;

  useEffect(() => { setPage(1); }, [search, filterUser, filterAction]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const inputCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus-visible:ring-[var(--brand)]';
  const selectCls = 'h-9 bg-[var(--bg-2)] border-[var(--line-2)] text-[var(--tx-1)]';

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb,var(--purple) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--purple) 25%,transparent)' }}>
          <ClipboardList size={15} color="var(--purple)" />
        </div>
        <div className="flex-1">
          <h1 className="t-heading">Activity Log</h1>
          <p className="t-body mt-0.5">Full audit trail of all user actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh" className="border-[var(--line-2)] text-[var(--tx-2)] hover:bg-[var(--bg-3)]">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Filters */}
      <div className="surface p-3.5 flex flex-wrap gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input placeholder="Search by user, resource…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} pl-8`} />
        </div>
        <div className="relative">
          <Filter size={14} color="var(--tx-3)" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className={`${selectCls} pl-8 min-w-[140px]`}>
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
              <SelectItem value="all">All Users</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.first_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className={`${selectCls} min-w-[130px]`}>
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-2)] border-[var(--line-2)]">
            {ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-16">
            <RefreshCw size={16} color="var(--tx-3)" className="animate-spin" />
            <span className="t-body">Loading…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardList size={32} color="var(--tx-3)" className="mb-3 opacity-40" />
            <p className="t-body">No activity found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Detail</th><th>IP</th></tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="t-small whitespace-nowrap text-[var(--tx-3)]">{formatDate(log.timestamp)}</td>
                    <td>
                      {log.user_name
                        ? <span className="font-medium text-[var(--tx-1)]">{log.user_name}</span>
                        : <span className="italic text-[var(--tx-3)]">System</span>}
                    </td>
                    <td><ActionBadge action={log.action} /></td>
                    <td>
                      {log.resource_type && (
                        <div>
                          <p className="t-small uppercase tracking-wide">{log.resource_type}</p>
                          {log.resource_name && <p className="text-sm text-[var(--tx-1)] mt-0.5">{log.resource_name}</p>}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap" title={log.detail}>
                      <span className="t-body">{log.detail}</span>
                    </td>
                    <td className="t-mono t-small whitespace-nowrap text-[var(--tx-3)]">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="t-small">{total} total entries</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 border-[var(--line-2)] text-[var(--tx-2)]">
                <ChevronLeft size={13} />
              </Button>
              <span className="text-sm text-[var(--tx-2)]">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 border-[var(--line-2)] text-[var(--tx-2)]">
                <ChevronRight size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
