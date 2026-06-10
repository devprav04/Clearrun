from celery import Celery
from decouple import config

celery = Celery(
    'cleanrun',
    broker=config('CELERY_BROKER_URL', default='redis://localhost:6379/0'),
    backend=config('CELERY_BROKER_URL', default='redis://localhost:6379/0'),
    include=['app.tasks'],
)

celery.conf.beat_schedule = {
    'check-amc-expirations-daily': {
        'task': 'app.tasks.check_amc_expirations',
        'schedule': 86400.0,
    },
    'check-calibration-due-daily': {
        'task': 'app.tasks.check_calibration_due',
        'schedule': 86400.0,
    },
}
