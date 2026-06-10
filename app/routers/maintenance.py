from datetime import date, timedelta, timezone
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..audit import log_action
from ..deps import get_current_user, get_db
from ..models import AMCContract, BreakdownTicket, CalibrationRecord, Instrument, MaintenanceLog, User
from ..schemas import (
    AMCContractCreate, AMCContractOut, AMCContractUpdate,
    BreakdownTicketCreate, BreakdownTicketOut, BreakdownTicketUpdate,
    CalibrationRecordCreate, CalibrationRecordOut, CalibrationRecordUpdate,
    MaintenanceLogCreate, MaintenanceLogOut, MaintenanceLogUpdate,
    paginated,
)

router = APIRouter(prefix='/api/maintenance', tags=['maintenance'])

CONTRACT_TYPE_LABELS = {'comprehensive': 'Comprehensive', 'non_comprehensive': 'Non-Comprehensive'}


# ── AMC Contracts ─────────────────────────────────────────────────────────────
def _enrich_amc(a: AMCContract) -> AMCContractOut:
    out = AMCContractOut.model_validate(a)
    out.instrument_name = a.instrument.name if a.instrument else None
    out.vendor_name = a.vendor.name if a.vendor else None
    out.days_until_expiry = (a.end_date - date.today()).days
    out.contract_value = float(a.contract_value)
    return out


@router.get('/amc/', response_model=dict)
def list_amc(page: int = 1, page_size: int = 20, instrument: int = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(AMCContract)
    if instrument:
        q = q.filter(AMCContract.instrument_id == instrument)
    total = q.count()
    return paginated([_enrich_amc(a) for a in q.offset((page-1)*page_size).limit(page_size).all()], total)


@router.get('/amc/expiring/', response_model=list)
def expiring_amc(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    contracts = db.query(AMCContract).filter(
        AMCContract.end_date <= today + timedelta(days=30),
        AMCContract.end_date >= today,
        AMCContract.status == 'active',
    ).all()
    return [_enrich_amc(a) for a in contracts]


@router.get('/amc/{amc_id}/', response_model=AMCContractOut)
def get_amc(amc_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    a = db.query(AMCContract).filter(AMCContract.id == amc_id).first()
    if not a:
        raise HTTPException(status_code=404, detail='AMC contract not found.')
    return _enrich_amc(a)


@router.post('/amc/', response_model=AMCContractOut, status_code=201)
def create_amc(request: Request, body: AMCContractCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=400, detail='end_date must be after start_date.')
    a = AMCContract(**body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    log_action(db, current_user, request, 'create', 'AMC Contract', a.instrument.name,
               f'AMC with {a.vendor.name} — {CONTRACT_TYPE_LABELS.get(a.contract_type, a.contract_type)} — expires {a.end_date}')
    return _enrich_amc(a)


@router.patch('/amc/{amc_id}/', response_model=AMCContractOut)
def update_amc(amc_id: int, request: Request, body: AMCContractUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(AMCContract).filter(AMCContract.id == amc_id).first()
    if not a:
        raise HTTPException(status_code=404, detail='AMC contract not found.')
    updates = body.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(a, field, value)
    # re-validate after applying updates
    if a.end_date <= a.start_date:
        raise HTTPException(status_code=400, detail='end_date must be after start_date.')
    db.commit()
    db.refresh(a)
    log_action(db, current_user, request, 'update', 'AMC Contract', a.instrument.name, f'Updated AMC — status: {a.status}')
    return _enrich_amc(a)


@router.delete('/amc/{amc_id}/', status_code=204)
def delete_amc(amc_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(AMCContract).filter(AMCContract.id == amc_id).first()
    if not a:
        raise HTTPException(status_code=404, detail='AMC contract not found.')
    log_action(db, current_user, request, 'delete', 'AMC Contract', a.instrument.name, f'Deleted AMC with {a.vendor.name}')
    db.delete(a)
    db.commit()


# ── Breakdown Tickets ─────────────────────────────────────────────────────────
def _enrich_ticket(t: BreakdownTicket) -> BreakdownTicketOut:
    out = BreakdownTicketOut.model_validate(t)
    out.instrument_name = t.instrument.name if t.instrument else None
    rb = t.reported_by
    out.reported_by_name = (f'{rb.first_name} {rb.last_name}'.strip() or rb.username) if rb else None
    at = t.assigned_to
    out.assigned_to_name = (f'{at.first_name} {at.last_name}'.strip() or at.username) if at else None
    if t.resolved_at and t.reported_at:
        out.mttr_hours = round((t.resolved_at - t.reported_at).total_seconds() / 3600, 2)
    return out


def _gen_ticket_id(db: Session, ticket_db_id: int) -> str:
    """Race-condition-free: uses the DB-assigned primary key, not a COUNT."""
    today = date.today()
    return f'TKT-{today.strftime("%Y%m")}-{ticket_db_id:04d}'


@router.get('/tickets/', response_model=dict)
def list_tickets(page: int = 1, page_size: int = 20, instrument: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(BreakdownTicket)
    if current_user.role == 'technician':
        q = q.filter(BreakdownTicket.assigned_to_id == current_user.id)
    if instrument:
        q = q.filter(BreakdownTicket.instrument_id == instrument)
    total = q.count()
    return paginated([_enrich_ticket(t) for t in q.order_by(BreakdownTicket.reported_at.desc()).offset((page-1)*page_size).limit(page_size).all()], total)


@router.get('/tickets/{ticket_id}/', response_model=BreakdownTicketOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    t = db.query(BreakdownTicket).filter(BreakdownTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Ticket not found.')
    return _enrich_ticket(t)


@router.post('/tickets/', response_model=BreakdownTicketOut, status_code=201)
def create_ticket(request: Request, body: BreakdownTicketCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    instrument = db.query(Instrument).filter(Instrument.id == body.instrument).first()
    if not instrument:
        raise HTTPException(status_code=404, detail='Instrument not found.')
    ticket = BreakdownTicket(
        ticket_id='',  # filled in after flush
        instrument_id=body.instrument,
        reported_by_id=current_user.id,
        priority=body.priority,
        description=body.description,
    )
    instrument.status = 'out_of_service'
    db.add(ticket)
    db.flush()  # assigns ticket.id from DB sequence — atomic, no race condition
    ticket.ticket_id = _gen_ticket_id(db, ticket.id)
    db.commit()
    db.refresh(ticket)
    log_action(db, current_user, request, 'ticket', 'Breakdown Ticket', instrument.name,
               f'Reported breakdown — {body.priority} priority: {body.description[:100]}')
    _notify_vendor(ticket, instrument, current_user, db)
    return _enrich_ticket(ticket)


def _notify_vendor(ticket: BreakdownTicket, instrument: Instrument, reporter: User, db: Session):
    """Fire-and-forget vendor email — failure is logged, never propagated to the caller."""
    import logging
    try:
        from decouple import config
        import smtplib
        from email.mime.text import MIMEText

        amc = db.query(AMCContract).filter(
            AMCContract.instrument_id == instrument.id,
            AMCContract.status == 'active',
        ).order_by(AMCContract.end_date.desc()).first()
        if not (amc and amc.vendor and amc.vendor.email):
            return

        from ..models import CompanySettings
        cs = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
        company_name = (cs and cs.company_name) or 'CleanRun Lab'
        reporter_name = f'{reporter.first_name} {reporter.last_name}'.strip() or reporter.username

        body_text = (
            f'Dear {amc.vendor.contact_person or amc.vendor.name},\n\n'
            f'Service call for:\n'
            f'  Instrument : {instrument.name}\n'
            f'  Serial No  : {instrument.serial_number}\n'
            f'  Ticket     : {ticket.ticket_id}\n'
            f'  Priority   : {ticket.priority}\n'
            f'  Description: {ticket.description}\n\n'
            f'Reported by: {reporter_name}\n'
            f'Regards,\n{company_name}'
        )
        msg = MIMEText(body_text)
        msg['Subject'] = f'[Service Call] Breakdown — {instrument.name} | {company_name}'
        msg['From'] = config('DEFAULT_FROM_EMAIL', default='cleanrun@lab.com')
        msg['To'] = amc.vendor.email

        host     = config('EMAIL_HOST', default='smtp.gmail.com')
        port     = config('EMAIL_PORT', default=587, cast=int)
        user     = config('EMAIL_HOST_USER', default='')
        password = config('EMAIL_HOST_PASSWORD', default='')
        if user and password:
            with smtplib.SMTP(host, port) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(msg)
    except Exception:
        logging.getLogger(__name__).exception('Failed to send vendor breakdown notification')


@router.patch('/tickets/{ticket_id}/', response_model=BreakdownTicketOut)
def update_ticket(ticket_id: int, request: Request, body: BreakdownTicketUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(BreakdownTicket).filter(BreakdownTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Ticket not found.')
    updates = body.model_dump(exclude_none=True)
    if 'assigned_to' in updates:
        t.assigned_to_id = updates.pop('assigned_to')
    for field, value in updates.items():
        setattr(t, field, value)
    if t.status == 'resolved' and not t.resolved_at:
        t.resolved_at = dt.datetime.now(timezone.utc)
        # Restore instrument to operational when the ticket is resolved
        if t.instrument and t.instrument.status == 'out_of_service':
            t.instrument.status = 'operational'
    db.commit()
    db.refresh(t)
    log_action(db, current_user, request, 'update', 'Breakdown Ticket',
               t.instrument.name if t.instrument else '', f'Ticket #{t.ticket_id} → {t.status}')
    return _enrich_ticket(t)


@router.delete('/tickets/{ticket_id}/', status_code=204)
def delete_ticket(ticket_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(BreakdownTicket).filter(BreakdownTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail='Ticket not found.')
    log_action(db, current_user, request, 'delete', 'Breakdown Ticket',
               t.instrument.name if t.instrument else '', f'Deleted ticket #{t.ticket_id}')
    db.delete(t)
    db.commit()


# ── Maintenance Logs ──────────────────────────────────────────────────────────
def _enrich_log(log: MaintenanceLog) -> MaintenanceLogOut:
    out = MaintenanceLogOut.model_validate(log)
    out.instrument_name = log.instrument.name if log.instrument else None
    pb = log.performed_by
    out.performed_by_name = (f'{pb.first_name} {pb.last_name}'.strip() or pb.username) if pb else None
    out.labor_cost = float(log.labor_cost)
    out.parts_cost = float(log.parts_cost)
    return out


@router.get('/logs/', response_model=dict)
def list_logs(page: int = 1, page_size: int = 20, instrument: int = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(MaintenanceLog).order_by(MaintenanceLog.performed_at.desc())
    if instrument:
        q = q.filter(MaintenanceLog.instrument_id == instrument)
    total = q.count()
    return paginated([_enrich_log(l) for l in q.offset((page-1)*page_size).limit(page_size).all()], total)


@router.get('/logs/{log_id}/', response_model=MaintenanceLogOut)
def get_log(log_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Maintenance log not found.')
    return _enrich_log(log)


@router.post('/logs/', response_model=MaintenanceLogOut, status_code=201)
def create_log(request: Request, body: MaintenanceLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = body.model_dump()
    instrument_id = data.pop('instrument')
    ticket_ref = data.pop('ticket', None)
    log = MaintenanceLog(instrument_id=instrument_id, ticket_id=ticket_ref, performed_by_id=current_user.id, **data)
    db.add(log)
    db.commit()
    db.refresh(log)
    log_action(db, current_user, request, 'create', 'Maintenance Log',
               log.instrument.name if log.instrument else '',
               f'Logged {log.maintenance_type} on {log.performed_at.date()}')
    return _enrich_log(log)


@router.patch('/logs/{log_id}/', response_model=MaintenanceLogOut)
def update_log(log_id: int, request: Request, body: MaintenanceLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Maintenance log not found.')
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    log_action(db, current_user, request, 'update', 'Maintenance Log',
               log.instrument.name if log.instrument else '', f'Updated maintenance log #{log.id}')
    return _enrich_log(log)


@router.delete('/logs/{log_id}/', status_code=204)
def delete_log(log_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail='Maintenance log not found.')
    log_action(db, current_user, request, 'delete', 'Maintenance Log',
               log.instrument.name if log.instrument else '', f'Deleted maintenance log #{log.id}')
    db.delete(log)
    db.commit()


# ── Calibration Records ───────────────────────────────────────────────────────
def _enrich_cal(c: CalibrationRecord) -> CalibrationRecordOut:
    out = CalibrationRecordOut.model_validate(c)
    out.instrument_name = c.instrument.name if c.instrument else None
    out.calibrated_by_vendor_name = c.calibrated_by_vendor.name if c.calibrated_by_vendor else None
    cb = c.calibrated_by
    if cb:
        out.calibrated_by_name = f'{cb.first_name} {cb.last_name}'.strip() or cb.username
    elif c.calibrated_by_vendor:
        out.calibrated_by_name = c.calibrated_by_vendor.name
    else:
        out.calibrated_by_name = '—'
    return out


@router.get('/calibration/', response_model=dict)
def list_calibrations(page: int = 1, page_size: int = 20, instrument: int = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(CalibrationRecord).order_by(CalibrationRecord.calibration_date.desc())
    if instrument:
        q = q.filter(CalibrationRecord.instrument_id == instrument)
    total = q.count()
    return paginated([_enrich_cal(c) for c in q.offset((page-1)*page_size).limit(page_size).all()], total)


@router.get('/calibration/{cal_id}/', response_model=CalibrationRecordOut)
def get_calibration(cal_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    c = db.query(CalibrationRecord).filter(CalibrationRecord.id == cal_id).first()
    if not c:
        raise HTTPException(status_code=404, detail='Calibration record not found.')
    return _enrich_cal(c)


@router.post('/calibration/', response_model=CalibrationRecordOut, status_code=201)
def create_calibration(request: Request, body: CalibrationRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.next_due_date <= body.calibration_date:
        raise HTTPException(status_code=400, detail='next_due_date must be after calibration_date.')
    data = body.model_dump()
    instrument_id = data.pop('instrument')
    vendor_id = data.pop('calibrated_by_vendor', None)
    c = CalibrationRecord(instrument_id=instrument_id, calibrated_by_id=current_user.id, calibrated_by_vendor_id=vendor_id, **data)
    db.add(c)
    db.commit()
    db.refresh(c)
    log_action(db, current_user, request, 'create', 'Calibration',
               c.instrument.name if c.instrument else '',
               f'Calibrated on {c.calibration_date} — next due {c.next_due_date}')
    return _enrich_cal(c)


@router.patch('/calibration/{cal_id}/', response_model=CalibrationRecordOut)
def update_calibration(cal_id: int, request: Request, body: CalibrationRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(CalibrationRecord).filter(CalibrationRecord.id == cal_id).first()
    if not c:
        raise HTTPException(status_code=404, detail='Calibration record not found.')
    updates = body.model_dump(exclude_none=True)
    if 'calibrated_by_vendor' in updates:
        c.calibrated_by_vendor_id = updates.pop('calibrated_by_vendor')
    for field, value in updates.items():
        setattr(c, field, value)
    if c.next_due_date <= c.calibration_date:
        raise HTTPException(status_code=400, detail='next_due_date must be after calibration_date.')
    db.commit()
    db.refresh(c)
    log_action(db, current_user, request, 'update', 'Calibration',
               c.instrument.name if c.instrument else '', f'Updated calibration record #{c.id}')
    return _enrich_cal(c)


@router.delete('/calibration/{cal_id}/', status_code=204)
def delete_calibration(cal_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(CalibrationRecord).filter(CalibrationRecord.id == cal_id).first()
    if not c:
        raise HTTPException(status_code=404, detail='Calibration record not found.')
    log_action(db, current_user, request, 'delete', 'Calibration',
               c.instrument.name if c.instrument else '', f'Deleted calibration record #{c.id}')
    db.delete(c)
    db.commit()
