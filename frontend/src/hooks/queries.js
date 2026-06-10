import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

const get  = (url, params) => api.get(url, { params }).then(r => r.data)
const list = (url, params) => api.get(url, { params }).then(r => r.data?.results || r.data || [])

export const QK = {
  dashboard:   ['dashboard'],
  manager:     ['manager-report'],
  instruments: ['instruments'],
  vendors:     ['vendors'],
  tickets:     (p) => ['tickets', p ?? {}],
  amc:         ['amc'],
  calibration: ['calibration'],
  parts:       ['parts'],
  users:       ['users'],
  auditLog:    (p) => ['audit-log', p],
  reports: {
    mttr:     ['mttr'],
    downtime: ['downtime-cost'],
    audit:    ['audit-report'],
  },
}

export const useDashboard    = ()    => useQuery({ queryKey: QK.dashboard,   queryFn: () => get('reports/dashboard/') })
export const useManagerReport = ()   => useQuery({ queryKey: QK.manager,     queryFn: () => get('reports/manager/') })
export const useInstruments  = ()    => useQuery({ queryKey: QK.instruments, queryFn: () => list('instruments/?page_size=200') })
export const useVendors      = ()    => useQuery({ queryKey: QK.vendors,     queryFn: () => list('vendors/?page_size=200') })
export const useTickets      = (p)   => useQuery({ queryKey: QK.tickets(p),  queryFn: () => list('maintenance/tickets/?page_size=200', p) })
export const useAmc          = ()    => useQuery({ queryKey: QK.amc,         queryFn: () => list('maintenance/amc/?page_size=200') })
export const useCalibration  = ()    => useQuery({ queryKey: QK.calibration, queryFn: () => list('maintenance/calibration/?page_size=200') })
export const useParts        = ()    => useQuery({ queryKey: QK.parts,       queryFn: () => list('inventory/parts/?page_size=200') })
export const useUsers        = ()    => useQuery({ queryKey: QK.users,       queryFn: () => list('auth/users/') })
export const useAuditLog     = (p)   => useQuery({ queryKey: QK.auditLog(p), queryFn: () => get('/auth/audit-log/', p) })
export const useMttr         = ()    => useQuery({ queryKey: QK.reports.mttr,     queryFn: () => list('reports/mttr/'),         retry: 0 })
export const useDowntime     = ()    => useQuery({ queryKey: QK.reports.downtime, queryFn: () => list('reports/downtime-cost/'), retry: 0 })
export const useAuditReport  = ()    => useQuery({ queryKey: QK.reports.audit,    queryFn: () => list('reports/audit/'),         retry: 0 })
