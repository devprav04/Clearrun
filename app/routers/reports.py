from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import (
    AMCContract, BreakdownTicket, CalibrationRecord,
    Instrument, MaintenanceLog, SparePart, User,
)

router = APIRouter(prefix='/api/reports', tags=['reports'])


@router.get('/dashboard/')
def dashboard_summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    instruments = db.query(Instrument)

    status_counts = {
        s: instruments.filter(Instrument.status == s).count()
        for s in ('operational', 'calibrating', 'broken_down', 'scheduled_maintenance', 'out_of_service')
    }
    status_counts['total'] = instruments.count()

    low_stock = db.query(SparePart).filter(SparePart.quantity_in_stock <= SparePart.minimum_stock_level).limit(10).all()
    low_stock_data = [
        {
            'id': p.id, 'name': p.name, 'part_number': p.part_number,
            'quantity_in_stock': p.quantity_in_stock,
            'minimum_stock_level': p.minimum_stock_level,
            'instruments': [i.name for i in p.compatible_instruments],
        }
        for p in low_stock
    ]

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
        'low_stock_parts': low_stock_data,
        'calibration_due_soon': db.query(CalibrationRecord).filter(
            CalibrationRecord.next_due_date <= today + timedelta(days=30),
            CalibrationRecord.next_due_date >= today,
        ).count(),
    }


@router.get('/manager/')
def manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not (current_user.role == 'manager' or current_user.is_superuser):
        raise HTTPException(status_code=403, detail='Manager access required.')
    today = date.today()

    amc_value = db.query(func.sum(AMCContract.contract_value)).filter(AMCContract.status == 'active').scalar() or 0
    pending_renewals = db.query(AMCContract).filter(
        AMCContract.end_date <= today + timedelta(days=30),
        AMCContract.status == 'active',
    ).count()

    total_cal = db.query(CalibrationRecord).count()
    valid_cal  = db.query(CalibrationRecord).filter(CalibrationRecord.status == 'valid').count()
    compliance = round((valid_cal / total_cal) * 100, 1) if total_cal else 100

    return {
        'active_amc_value': float(amc_value),
        'amc_pending_renewals': pending_renewals,
        'compliance_percentage': compliance,
    }


@router.get('/mttr/')
def mttr_report(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    resolved = db.query(BreakdownTicket).filter(
        BreakdownTicket.status == 'resolved',
        BreakdownTicket.resolved_at.isnot(None),
    ).all()

    by_instrument: dict = {}
    for t in resolved:
        if not (t.resolved_at and t.reported_at):
            continue
        hours = round((t.resolved_at - t.reported_at).total_seconds() / 3600, 2)
        name = t.instrument.name
        if name not in by_instrument:
            by_instrument[name] = {'instrument_name': name, 'total': 0, 'count': 0}
        by_instrument[name]['total'] += hours
        by_instrument[name]['count'] += 1

    return [
        {'instrument_name': v['instrument_name'], 'mttr_hours': round(v['total'] / v['count'], 2)}
        for v in by_instrument.values()
    ]


@router.get('/downtime-cost/')
def downtime_cost(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    logs = db.query(MaintenanceLog).all()
    by_instrument: dict = {}
    for log in logs:
        name = log.instrument.name
        if name not in by_instrument:
            by_instrument[name] = {'instrument_name': name, 'downtime_cost': 0}
        by_instrument[name]['downtime_cost'] += float(log.labor_cost) + float(log.parts_cost)
    return list(by_instrument.values())


@router.get('/audit/')
def audit_readiness(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    instruments = db.query(Instrument).all()
    data = []
    for inst in instruments:
        latest_cal = sorted(inst.calibration_records, key=lambda c: c.calibration_date, reverse=True)
        latest_cal = latest_cal[0] if latest_cal else None
        active_amc = [a for a in inst.amc_contracts if a.status == 'active']
        active_amc = sorted(active_amc, key=lambda a: a.end_date, reverse=True)
        active_amc = active_amc[0] if active_amc else None
        latest_maint = sorted(inst.maintenance_logs, key=lambda m: m.performed_at, reverse=True)
        latest_maint = latest_maint[0] if latest_maint else None

        cal_ok  = bool(latest_cal  and latest_cal.status == 'valid'  and latest_cal.next_due_date >= today)
        amc_ok  = bool(active_amc  and active_amc.end_date >= today)
        score   = (50 if cal_ok else 0) + (30 if amc_ok else 0) + (20 if latest_maint else 0)

        data.append({
            'instrument_name':      inst.name,
            'calibration_status':   latest_cal.status if latest_cal else 'no_record',
            'calibration_ok':       cal_ok,
            'amc_status':           active_amc.status if active_amc else 'none',
            'amc_active':           amc_ok,
            'last_maintenance_date': str(latest_maint.performed_at.date()) if latest_maint else None,
            'compliance_score':     score,
            'audit_ready':          score >= 80,
        })
    return data


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
            'title': f'AMC Expiry: {amc.instrument.name}',
            'date': str(amc.end_date),
            'detail': f'{amc.vendor.name} · {amc.contract_type}',
            'urgent': days <= 30,
            'color': 'red' if days <= 7 else ('orange' if days <= 30 else 'yellow'),
        })

    for cal in db.query(CalibrationRecord).filter(
        CalibrationRecord.next_due_date >= start, CalibrationRecord.next_due_date <= end
    ).all():
        days = (cal.next_due_date - today).days
        events.append({
            'id': f'cal-{cal.id}', 'type': 'calibration_due',
            'title': f'Calibration Due: {cal.instrument.name}',
            'date': str(cal.next_due_date),
            'detail': cal.instrument.location,
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
            'title': f'Maintenance Due: {log.instrument.name}',
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
            'title': f'Open Ticket: {ticket.instrument.name}',
            'date': str(ticket.reported_at.date()),
            'detail': f'{ticket.priority} priority',
            'urgent': ticket.priority in ('high', 'critical'),
            'color': 'red' if ticket.priority == 'critical' else 'orange',
        })

    events.sort(key=lambda e: e['date'])
    return events
