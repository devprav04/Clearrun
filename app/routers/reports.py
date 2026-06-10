from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import (
    AMCContract, BreakdownTicket, CalibrationRecord,
    Instrument, MaintenanceLog, SparePart, User,
)

router = APIRouter(prefix='/api/reports', tags=['reports'])


# ── Shared helper: audit data with bulk SQL (used by both REST and PDF) ───────
def _build_audit_data(db: Session, today: date) -> list[dict]:
    """
    Returns per-instrument audit readiness with a single bulk query set
    instead of N+1 relationship loads.
    """
    # Latest calibration per instrument
    latest_cal_sub = (
        db.query(
            CalibrationRecord.instrument_id,
            func.max(CalibrationRecord.calibration_date).label('max_cal_date'),
        )
        .group_by(CalibrationRecord.instrument_id)
        .subquery()
    )
    latest_cals = (
        db.query(CalibrationRecord)
        .join(latest_cal_sub, and_(
            CalibrationRecord.instrument_id == latest_cal_sub.c.instrument_id,
            CalibrationRecord.calibration_date == latest_cal_sub.c.max_cal_date,
        ))
        .all()
    )
    cal_by_inst = {c.instrument_id: c for c in latest_cals}

    # Latest active AMC per instrument
    latest_amc_sub = (
        db.query(
            AMCContract.instrument_id,
            func.max(AMCContract.end_date).label('max_end_date'),
        )
        .filter(AMCContract.status == 'active')
        .group_by(AMCContract.instrument_id)
        .subquery()
    )
    latest_amcs = (
        db.query(AMCContract)
        .join(latest_amc_sub, and_(
            AMCContract.instrument_id == latest_amc_sub.c.instrument_id,
            AMCContract.end_date == latest_amc_sub.c.max_end_date,
        ))
        .filter(AMCContract.status == 'active')
        .all()
    )
    amc_by_inst = {a.instrument_id: a for a in latest_amcs}

    # Latest maintenance log per instrument
    latest_maint_sub = (
        db.query(
            MaintenanceLog.instrument_id,
            func.max(MaintenanceLog.performed_at).label('max_performed_at'),
        )
        .group_by(MaintenanceLog.instrument_id)
        .subquery()
    )
    latest_maints = (
        db.query(MaintenanceLog)
        .join(latest_maint_sub, and_(
            MaintenanceLog.instrument_id == latest_maint_sub.c.instrument_id,
            MaintenanceLog.performed_at == latest_maint_sub.c.max_performed_at,
        ))
        .all()
    )
    maint_by_inst = {m.instrument_id: m for m in latest_maints}

    instruments = db.query(Instrument).order_by(Instrument.name).all()
    data = []
    for inst in instruments:
        latest_cal   = cal_by_inst.get(inst.id)
        active_amc   = amc_by_inst.get(inst.id)
        latest_maint = maint_by_inst.get(inst.id)

        cal_ok  = bool(latest_cal  and latest_cal.status == 'valid'  and latest_cal.next_due_date >= today)
        amc_ok  = bool(active_amc  and active_amc.end_date >= today)
        score   = (50 if cal_ok else 0) + (30 if amc_ok else 0) + (20 if latest_maint else 0)

        data.append({
            'instrument_name':       inst.name,
            'calibration_status':    latest_cal.status if latest_cal else 'no_record',
            'calibration_ok':        cal_ok,
            'amc_status':            active_amc.status if active_amc else 'none',
            'amc_active':            amc_ok,
            'last_maintenance_date': str(latest_maint.performed_at.date()) if latest_maint else None,
            'compliance_score':      score,
            'audit_ready':           score >= 80,
        })
    return data


# ── Dashboard ─────────────────────────────────────────────────────────────────
@router.get('/dashboard/')
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()

    # Single GROUP BY instead of 6 separate COUNT queries
    rows = (
        db.query(Instrument.status, func.count(Instrument.id).label('cnt'))
        .group_by(Instrument.status)
        .all()
    )
    status_counts: dict = {s: 0 for s in ('operational', 'calibrating', 'broken_down', 'scheduled_maintenance', 'out_of_service')}
    for row in rows:
        status_counts[row.status] = row.cnt
    status_counts['total'] = sum(v for k, v in status_counts.items() if k != 'total')

    low_stock = (
        db.query(SparePart)
        .filter(SparePart.quantity_in_stock <= SparePart.minimum_stock_level)
        .limit(10)
        .all()
    )

    return {
        'instrument_status': status_counts,
        'open_breakdown_tickets': db.query(BreakdownTicket).filter(
            BreakdownTicket.status.in_(['open', 'assigned', 'in_progress'])
        ).count(),
        'amc_expiring_in_30_days': db.query(AMCContract).filter(
            AMCContract.end_date <= today + timedelta(days=30),
            AMCContract.end_date >= today,
            AMCContract.status == 'active',
        ).count(),
        'low_stock_parts': [
            {
                'id': p.id, 'name': p.name, 'part_number': p.part_number,
                'quantity_in_stock': p.quantity_in_stock,
                'minimum_stock_level': p.minimum_stock_level,
                'instruments': [i.name for i in p.compatible_instruments],
            }
            for p in low_stock
        ],
        'calibration_due_soon': db.query(CalibrationRecord).filter(
            CalibrationRecord.next_due_date <= today + timedelta(days=30),
            CalibrationRecord.next_due_date >= today,
        ).count(),
    }


# ── Manager dashboard ─────────────────────────────────────────────────────────
@router.get('/manager/')
def manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (current_user.role == 'manager' or current_user.is_superuser):
        raise HTTPException(status_code=403, detail='Manager access required.')
    today = date.today()

    amc_value = (
        db.query(func.sum(AMCContract.contract_value))
        .filter(AMCContract.status == 'active')
        .scalar() or 0
    )
    pending_renewals = db.query(AMCContract).filter(
        AMCContract.end_date <= today + timedelta(days=30),
        AMCContract.status == 'active',
    ).count()

    total_cal = db.query(CalibrationRecord).count()
    valid_cal  = db.query(CalibrationRecord).filter(CalibrationRecord.status == 'valid').count()
    compliance = round((valid_cal / total_cal) * 100, 1) if total_cal else 100.0

    return {
        'active_amc_value':    float(amc_value),
        'amc_pending_renewals': pending_renewals,
        'compliance_percentage': compliance,
    }


# ── MTTR — SQL AVG instead of Python loop ────────────────────────────────────
@router.get('/mttr/')
def mttr_report(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = (
        db.query(
            Instrument.name.label('instrument_name'),
            func.round(
                func.avg(
                    func.extract(
                        'epoch',
                        BreakdownTicket.resolved_at - BreakdownTicket.reported_at,
                    )
                ) / 3600,
                2,
            ).label('mttr_hours'),
            func.count(BreakdownTicket.id).label('ticket_count'),
        )
        .join(Instrument, BreakdownTicket.instrument_id == Instrument.id)
        .filter(
            BreakdownTicket.status == 'resolved',
            BreakdownTicket.resolved_at.isnot(None),
            BreakdownTicket.reported_at.isnot(None),
        )
        .group_by(Instrument.name)
        .order_by(func.avg(
            func.extract('epoch', BreakdownTicket.resolved_at - BreakdownTicket.reported_at)
        ).desc())
        .all()
    )
    return [
        {'instrument_name': r.instrument_name, 'mttr_hours': float(r.mttr_hours or 0), 'ticket_count': r.ticket_count}
        for r in rows
    ]


# ── Downtime cost — SQL SUM GROUP BY instead of Python loop ──────────────────
@router.get('/downtime-cost/')
def downtime_cost(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = (
        db.query(
            Instrument.name.label('instrument_name'),
            func.coalesce(
                func.sum(MaintenanceLog.labor_cost + MaintenanceLog.parts_cost), 0
            ).label('total_cost'),
        )
        .join(Instrument, MaintenanceLog.instrument_id == Instrument.id)
        .group_by(Instrument.name)
        .order_by(func.sum(MaintenanceLog.labor_cost + MaintenanceLog.parts_cost).desc())
        .all()
    )
    return [{'instrument_name': r.instrument_name, 'downtime_cost': float(r.total_cost)} for r in rows]


# ── Audit readiness ───────────────────────────────────────────────────────────
@router.get('/audit/')
def audit_readiness(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return _build_audit_data(db, date.today())


# ── Calendar ──────────────────────────────────────────────────────────────────
@router.get('/calendar/')
def calendar_events(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    start = today - timedelta(days=30)
    end   = today + timedelta(days=90)
    events = []

    for amc in db.query(AMCContract).filter(
        AMCContract.end_date >= start, AMCContract.end_date <= end, AMCContract.status == 'active'
    ).all():
        days = (amc.end_date - today).days
        events.append({
            'id': f'amc-{amc.id}', 'type': 'amc_expiry',
            'title': f'AMC Expiry: {amc.instrument.name if amc.instrument else "Unknown"}',
            'date': str(amc.end_date),
            'detail': f'{amc.vendor.name if amc.vendor else ""} · {amc.contract_type}',
            'urgent': days <= 30,
            'color': 'red' if days <= 7 else ('orange' if days <= 30 else 'yellow'),
        })

    for cal in db.query(CalibrationRecord).filter(
        CalibrationRecord.next_due_date >= start, CalibrationRecord.next_due_date <= end
    ).all():
        days = (cal.next_due_date - today).days
        events.append({
            'id': f'cal-{cal.id}', 'type': 'calibration_due',
            'title': f'Calibration Due: {cal.instrument.name if cal.instrument else "Unknown"}',
            'date': str(cal.next_due_date),
            'detail': cal.instrument.location if cal.instrument else '',
            'urgent': days <= 14,
            'color': 'purple' if days > 14 else ('orange' if days > 0 else 'red'),
        })

    for log in db.query(MaintenanceLog).filter(
        MaintenanceLog.next_maintenance_due >= start,
        MaintenanceLog.next_maintenance_due <= end,
    ).all():
        days = (log.next_maintenance_due - today).days
        events.append({
            'id': f'maint-{log.id}', 'type': 'maintenance_due',
            'title': f'Maintenance Due: {log.instrument.name if log.instrument else "Unknown"}',
            'date': str(log.next_maintenance_due),
            'detail': log.maintenance_type,
            'urgent': days <= 7,
            'color': 'blue',
        })

    for ticket in db.query(BreakdownTicket).filter(
        BreakdownTicket.status.in_(['open', 'assigned', 'in_progress'])
    ).all():
        events.append({
            'id': f'ticket-{ticket.id}', 'type': 'breakdown',
            'title': f'Open Ticket: {ticket.instrument.name if ticket.instrument else "Unknown"}',
            'date': str(ticket.reported_at.date()),
            'detail': f'{ticket.priority} priority',
            'urgent': ticket.priority in ('high', 'critical'),
            'color': 'red' if ticket.priority == 'critical' else 'orange',
        })

    events.sort(key=lambda e: e['date'])
    return events
