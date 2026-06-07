import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cleanrun.settings')

app = Celery('cleanrun')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
