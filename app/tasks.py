import logging
import smtplib
from datetime import date, timedelta
from email.mime.text import MIMEText

from decouple import config

from .celery_app import celery
from .database import SessionLocal
from .models import AMCContract, CalibrationRecord, CompanySettings, User

log = logging.getLogger(__name__)


# ── Shared email helper ───────────────────────────────────────────────────────
def _send_email(subject: str, body: str, to_addrs: list[str]) -> None:
    """Send a plain-text email. Logs errors instead of silently ignoring them."""
    user     = config('EMAIL_HOST_USER',     default='')
    password = config('EMAIL_HOST_PASSWORD', default='')
    if not (user and password and to_addrs):
        return
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From']    = config('DEFAULT_FROM_EMAIL', default='cleanrun@lab.com')
    msg['To']      = ', '.join(to_addrs)
    try:
        with smtplib.SMTP(
            config('EMAIL_HOST', default='smtp.gmail.com'),
            config('EMAIL_PORT', default=587, cast=int),
        ) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
    except Exception:
        log.exception('Failed to send email — subject: %s — to: %s', subject, to_addrs)


def _manager_emails(db) -> list[str]:
    """Return email addresses of all active manager-role users, with company email as fallback."""
    emails = [
        u.email for u in
        db.query(User.email).filter(
            User.role.in_(['manager']),
            User.is_active == True,
            User.email != '',
        ).all()
    ]
    cs = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if cs and cs.email and cs.email not in emails:
        emails.append(cs.email)
    return emails or ['lab.manager@company.com']  # hard fallback if nothing configured


# ── Tasks ─────────────────────────────────────────────────────────────────────
@celery.task(bind=True, max_retries=3)
def check_amc_expirations(self):
    db = SessionLocal()
    try:
        today    = date.today()
        managers = _manager_emails(db)
        cs       = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
        company  = (cs and cs.company_name) or 'CleanRun Lab'

        for days in [30, 15, 7]:
            threshold = today + timedelta(days=days)
            contracts = db.query(AMCContract).filter(
                AMCContract.end_date == threshold,
                AMCContract.status == 'active',
            ).all()
            for contract in contracts:
                inst_name   = contract.instrument.name if contract.instrument else 'Unknown'
                vendor_name = contract.vendor.name     if contract.vendor     else 'Unknown'
                subject = f'[{company}] AMC Expiry Alert: {inst_name} in {days} days'
                body    = (
                    f'AMC Contract for {inst_name} with vendor {vendor_name} '
                    f'expires on {contract.end_date}.\n\n'
                    f'Please arrange renewal.\n\nRegards,\n{company}'
                )
                _send_email(subject, body, managers)
                log.info('AMC expiry alert sent for %s (%d days)', inst_name, days)
    except Exception as exc:
        log.exception('check_amc_expirations failed')
        raise self.retry(exc=exc, countdown=300)
    finally:
        db.close()


@celery.task(bind=True, max_retries=3)
def check_calibration_due(self):
    db = SessionLocal()
    try:
        today    = date.today()
        managers = _manager_emails(db)
        cs       = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
        company  = (cs and cs.company_name) or 'CleanRun Lab'

        due_records = db.query(CalibrationRecord).filter(
            CalibrationRecord.next_due_date <= today + timedelta(days=7),
            CalibrationRecord.status == 'valid',
        ).all()

        for record in due_records:
            record.status = 'due_soon'
            inst_name = record.instrument.name if record.instrument else 'Unknown'
            subject = f'[{company}] Calibration Due: {inst_name}'
            body    = (
                f'Calibration for {inst_name} is due on {record.next_due_date}.\n\n'
                f'Please schedule calibration.\n\nRegards,\n{company}'
            )
            _send_email(subject, body, managers)
            log.info('Calibration due alert sent for %s', inst_name)

        if due_records:
            db.commit()
    except Exception as exc:
        log.exception('check_calibration_due failed')
        db.rollback()
        raise self.retry(exc=exc, countdown=300)
    finally:
        db.close()
