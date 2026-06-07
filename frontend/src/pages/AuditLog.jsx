import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

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
  { value: '', label: 'All Actions' }, { value: 'create', label: 'Created' },
  { value: 'update', label: 'Updated' }, { value: 'delete', label: 'Deleted' },
  { value: 'login', label: 'Logged In' }, { value: 'logout', label: 'Logged Out' },
  { value: 'checkout', label: 'Part Taken' }, { value: 'ticket', label: 'Ticket Reported' },
];

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || 'var(--tx-3)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 'var(--r-sm)',
      fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      color, background: `color-mix(in srgb,${color} 10%,transparent)`,
      border: `1px solid color-mix(in srgb,${color} 20%,transparent)`,
    }}>
      {ACTION_LABELS[action] || action}
    </span>
  );
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;

  const fetchUsers = useCallback(async () => {
    try { const res = await api.get('/auth/users/'); setUsers(res.data?.results || res.data || []); } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterUser) params.set('user', filterUser);
      if (filterAction) params.set('action', filterAction);
      params.set('page', page); params.set('page_size', PAGE_SIZE);
      const res = await api.get(`/auth/audit-log/?${params}`);
      if (res.data?.results !== undefined) { setLogs(res.data.results); setTotal(res.data.count); }
      else { setLogs(res.data); setTotal(res.data.length); }
    } catch (_) { /* errors surface via empty state */ }
    finally { setLoading(false); }
  }, [search, filterUser, filterAction, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, filterUser, filterAction]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb,var(--purple) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--purple) 25%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ClipboardList size={15} color="var(--purple)" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="t-heading">Activity Log</h1>
          <p className="t-body" style={{ marginTop: 1 }}>Full audit trail of all user actions</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-ghost btn-sm" title="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="surface" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search by user, resource…" value={search} onChange={e => setSearch(e.target.value)}
            className="input" style={{ paddingLeft: 32 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={14} color="var(--tx-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input" style={{ paddingLeft: 30, width: 'auto', minWidth: 140 }}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.first_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}</option>)}
          </select>
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="input" style={{ width: 'auto', minWidth: 130 }}>
          {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '64px 0' }}>
            <RefreshCw size={16} color="var(--tx-3)" className="animate-spin" />
            <span className="t-body">Loading…</span>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <ClipboardList size={32} color="var(--tx-3)" style={{ marginBottom: 12, opacity: .4 }} />
            <p className="t-body">No activity found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th><th>User</th><th>Action</th>
                  <th>Resource</th><th>Detail</th><th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="t-small" style={{ whiteSpace: 'nowrap', color: 'var(--tx-3)' }}>{formatDate(log.timestamp)}</td>
                    <td>
                      {log.user_name
                        ? <span style={{ fontWeight: 500, color: 'var(--tx-1)' }}>{log.user_name}</span>
                        : <span style={{ fontStyle: 'italic', color: 'var(--tx-3)' }}>System</span>}
                    </td>
                    <td><ActionBadge action={log.action} /></td>
                    <td>
                      {log.resource_type && (
                        <div>
                          <p className="t-small" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{log.resource_type}</p>
                          {log.resource_name && <p style={{ fontSize: '0.875rem', color: 'var(--tx-1)', marginTop: 1 }}>{log.resource_name}</p>}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.detail}>
                      <span className="t-body">{log.detail}</span>
                    </td>
                    <td className="t-mono t-small" style={{ whiteSpace: 'nowrap', color: 'var(--tx-3)' }}>{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span className="t-small">{total} total entries</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--tx-2)' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="btn btn-ghost btn-sm" style={{ padding: '0 8px' }}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
