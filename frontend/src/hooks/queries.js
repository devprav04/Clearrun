import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

const get  = (url, params) => api.get(url, { params }).then(r => r.data)
const list = (url, params) => api.get(url, { params }).then(r => r.data?.results || r.data || [])

export const QK = {
  dashboard:     ['dashboard'],
  manager:       ['manager-report'],
  instruments:   ['instruments'],
  vendors:       ['vendors'],
  tickets:       (p) => ['tickets', p ?? {}],
  amc:           ['amc'],
  calibration:   ['calibration'],
  logs:          (p) => ['logs', p ?? {}],
  parts:         ['parts'],
  users:         ['users'],
  auditLog:      (p) => ['audit-log', p],
  notifications: ['notifications'],
  reports: {
    mttr:     ['mttr'],
    downtime: ['downtime-cost'],
    audit:    ['audit-report'],
  },
}

export const useDashboard     = ()    => useQuery({ queryKey: QK.dashboard,      queryFn: () => get('reports/dashboard/') })
export const useManagerReport = ()    => useQuery({ queryKey: QK.manager,        queryFn: () => get('reports/manager/') })
export const useInstruments   = ()    => useQuery({ queryKey: QK.instruments,    queryFn: () => list('instruments/?page_size=200') })
export const useVendors       = ()    => useQuery({ queryKey: QK.vendors,        queryFn: () => list('vendors/?page_size=200') })
export const useTickets       = (p)   => useQuery({ queryKey: QK.tickets(p),     queryFn: () => list('maintenance/tickets/?page_size=200', p) })
export const useAmc           = ()    => useQuery({ queryKey: QK.amc,            queryFn: () => list('maintenance/amc/?page_size=200') })
export const useCalibration   = ()    => useQuery({ queryKey: QK.calibration,    queryFn: () => list('maintenance/calibration/?page_size=200') })
export const useLogs          = (p)   => useQuery({ queryKey: QK.logs(p),        queryFn: () => list('maintenance/logs/?page_size=200', p) })
export const useParts         = ()    => useQuery({ queryKey: QK.parts,          queryFn: () => list('inventory/parts/?page_size=200') })
export const useUsers         = ()    => useQuery({ queryKey: QK.users,          queryFn: () => list('auth/users/') })
export const useAuditLog      = (p)   => useQuery({ queryKey: QK.auditLog(p),    queryFn: () => get('/auth/audit-log/', p) })
export const useMttr          = ()    => useQuery({ queryKey: QK.reports.mttr,     queryFn: () => list('reports/mttr/'),          retry: 0 })
export const useDowntime      = ()    => useQuery({ queryKey: QK.reports.downtime, queryFn: () => list('reports/downtime-cost/'),  retry: 0 })
export const useAuditReport   = ()    => useQuery({ queryKey: QK.reports.audit,    queryFn: () => list('reports/audit/'),          retry: 0 })

export const useNotifications = () => useQuery({
  queryKey: QK.notifications,
  queryFn: () => get('reports/dashboard/').then(d => {
    const alerts = []
    if (d?.low_stock_parts?.length) {
      d.low_stock_parts.forEach(p => alerts.push({ id: `stock-${p.id}`, type: 'stock', title: `Low stock: ${p.name}`, body: `${p.quantity_in_stock} left (min ${p.minimum_stock_level})`, severity: 'warning' }))
    }
    if (d?.calibration_due_soon > 0) {
      alerts.push({ id: 'cal-due', type: 'calibration', title: 'Calibrations due soon', body: `${d.calibration_due_soon} calibration${d.calibration_due_soon > 1 ? 's' : ''} due within 30 days`, severity: 'info' })
    }
    if (d?.open_tickets > 0) {
      alerts.push({ id: 'tickets-open', type: 'ticket', title: 'Open breakdown tickets', body: `${d.open_tickets} ticket${d.open_tickets > 1 ? 's' : ''} awaiting resolution`, severity: 'error' })
    }
    if (d?.expiring_amc > 0) {
      alerts.push({ id: 'amc-expiry', type: 'amc', title: 'AMC contracts expiring', body: `${d.expiring_amc} contract${d.expiring_amc > 1 ? 's' : ''} expire within 30 days`, severity: 'warning' })
    }
    return alerts
  }),
  refetchInterval: 60_000,
  retry: 0,
})
