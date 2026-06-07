from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from datetime import date, timedelta


@shared_task
def check_amc_expirations():
    from .models import AMCContract
    today = date.today()
    for days in [30, 15, 7]:
        threshold = today + timedelta(days=days)
        contracts = AMCContract.objects.filter(end_date=threshold, status='active')
        for contract in contracts:
            send_mail(
                subject=f"[CleanRun] AMC Expiry Alert: {contract.instrument.name} in {days} days",
                message=(
                    f"AMC Contract for {contract.instrument.name} with vendor {contract.vendor.name} "
                    f"expires on {contract.end_date}. Please arrange renewal."
                ),
                from_email='cleanrun@lab.com',
                recipient_list=['lab.manager@company.com'],
                fail_silently=True,
            )


@shared_task
def check_calibration_due():
    from .models import CalibrationRecord
    today = date.today()
    due_soon = CalibrationRecord.objects.filter(next_due_date__lte=today + timedelta(days=7), status='valid')
    for record in due_soon:
        record.status = 'due_soon'
        record.save()
        send_mail(
            subject=f"[CleanRun] Calibration Due: {record.instrument.name}",
            message=f"Calibration for {record.instrument.name} is due on {record.next_due_date}.",
            from_email='cleanrun@lab.com',
            recipient_list=['lab.manager@company.com'],
            fail_silently=True,
        )
