from django.db import models
from django.conf import settings


class Vendor(models.Model):
    SERVICE_TYPES = [
        ('calibration',   'Calibration'),
        ('amc',           'AMC / Maintenance'),
        ('supply',        'Parts Supply'),
        ('repair',        'Repair & Service'),
        ('installation',  'Installation'),
        ('multiple',      'Multiple Services'),
    ]

    # ── Core contact ─────────────────────────────────────────
    name             = models.CharField(max_length=200)
    contact_person   = models.CharField(max_length=100, blank=True)
    email            = models.EmailField(blank=True)
    phone            = models.CharField(max_length=20, blank=True)
    alternate_phone  = models.CharField(max_length=20, blank=True)
    address          = models.TextField(blank=True)
    website          = models.URLField(blank=True)

    # ── Business details ─────────────────────────────────────
    service_type     = models.CharField(max_length=20, choices=SERVICE_TYPES, blank=True, default='')
    gstin            = models.CharField(max_length=20, blank=True, verbose_name='GSTIN / Tax ID')
    pan              = models.CharField(max_length=15, blank=True, verbose_name='PAN')
    payment_terms    = models.CharField(max_length=100, blank=True, help_text='e.g. Net 30, 50% advance')
    bank_name        = models.CharField(max_length=100, blank=True)
    bank_account     = models.CharField(max_length=30, blank=True)
    bank_ifsc        = models.CharField(max_length=15, blank=True, verbose_name='IFSC / Swift Code')

    # ── Status & notes ───────────────────────────────────────
    is_active        = models.BooleanField(default=True)
    rating           = models.PositiveSmallIntegerField(null=True, blank=True, help_text='1-5 star rating')
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Instrument(models.Model):
    class Status(models.TextChoices):
        OPERATIONAL = 'operational', 'Operational'
        CALIBRATING = 'calibrating', 'Calibrating'
        BROKEN_DOWN = 'broken_down', 'Broken Down'
        SCHEDULED_MAINTENANCE = 'scheduled_maintenance', 'Under Scheduled Maintenance'
        OUT_OF_SERVICE = 'out_of_service', 'Out of Service'

    name = models.CharField(max_length=200)
    model = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, unique=True)
    manufacturer = models.CharField(max_length=200, blank=True)
    installation_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.OPERATIONAL)
    qr_code = models.CharField(max_length=100, unique=True, blank=True)
    user_manual = models.FileField(upload_to='manuals/', blank=True, null=True)
    calibration_guideline = models.FileField(upload_to='guidelines/', blank=True, null=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='instruments')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

    def save(self, *args, **kwargs):
        if not self.qr_code:
            self.qr_code = f"CR-{self.serial_number}"
        super().save(*args, **kwargs)

