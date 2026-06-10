from datetime import date, timedelta

from .celery_app import celery
from .database import SessionLocal
from .models import AMCContract, CalibrationRecord


@celery.task
def check_amc_expirations():
    db = SessionLocal()
    try:
        today = date.today()
        for days in [30, 15, 7]:
            threshold = today + timedelta(days=days)
            for contract in db.query(AMCContract).filter(
                AMCContract.end_date == threshold, AMCContract.status == 'active'
            ).all():
                _send_amc_alert(contract, days)
    finally:
        db.close()


@celery.task
def check_calibration_due():
    db = SessionLocal()
    try:
        today = date.today()
        due = db.query(CalibrationRecord).filter(
            CalibrationRecord.next_due_date <= today + timedelta(days=7),
            CalibrationRecord.status == 'valid',
        ).all()
        for record in due:
            record.status = 'due_soon'
            _send_calibration_alert(record)
        db.commit()
    finally:
        db.close()


def _send_amc_alert(contract: AMCContract, days: int):
    try:
        import smtplib
        from email.mime.text import MIMEText
        from decouple import config

        body = (
            f'AMC Contract for {contract.instrument.name} with vendor {contract.vendor.name} '
            f'expires on {contract.end_date}. Please arrange renewal.'
        )
        msg = MIMEText(body)
        msg['Subject'] = f'[CleanRun] AMC Expiry Alert: {contract.instrument.name} in {days} days'
        msg['From'] = config('DEFAULT_FROM_EMAIL', default='cleanrun@lab.com')
        msg['To'] = 'lab.manager@company.com'

        host = config('EMAIL_HOST', default='smtp.gmail.com')
        port = config('EMAIL_PORT', default=587, cast=int)
        user = config('EMAIL_HOST_USER', default='')
        password = config('EMAIL_HOST_PASSWORD', default='')
        if user and password:
            with smtplib.SMTP(host, port) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(msg)
    except Exception:
        pass


def _send_calibration_alert(record: CalibrationRecord):
    try:
        import smtplib
        from email.mime.text import MIMEText
        from decouple import config

        body = f'Calibration for {record.instrument.name} is due on {record.next_due_date}.'
        msg = MIMEText(body)
        msg['Subject'] = f'[CleanRun] Calibration Due: {record.instrument.name}'
        msg['From'] = config('DEFAULT_FROM_EMAIL', default='cleanrun@lab.com')
        msg['To'] = 'lab.manager@company.com'

        host = config('EMAIL_HOST', default='smtp.gmail.com')
        port = config('EMAIL_PORT', default=587, cast=int)
        user = config('EMAIL_HOST_USER', default='')
        password = config('EMAIL_HOST_PASSWORD', default='')
        if user and password:
            with smtplib.SMTP(host, port) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(msg)
    except Exception:
        pass
