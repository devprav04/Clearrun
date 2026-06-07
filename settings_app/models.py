from django.db import models
from django.conf import settings


class CompanySettings(models.Model):
    company_name = models.CharField(max_length=200, default='CleanRun IMMS')
    tagline = models.CharField(max_length=300, blank=True, default='Instrument Management System')
    logo = models.ImageField(upload_to='company/', blank=True, null=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    primary_color = models.CharField(max_length=7, default='#2563eb')
    # Equipment code format: COMPANY/DEPT/SUBDEPT/INSTRUMENTTYPE/NUMBER
    company_code = models.CharField(max_length=20, blank=True, default='')
    department_code = models.CharField(max_length=20, blank=True, default='')
    sub_dept_code = models.CharField(max_length=20, blank=True, default='')
    # Legacy fields kept for backwards compatibility
    equipment_code_prefix = models.CharField(max_length=20, blank=True, default='EQ')
    equipment_code_separator = models.CharField(max_length=5, blank=True, default='-')
    equipment_code_digits = models.PositiveSmallIntegerField(default=3)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Company Settings'

    def __str__(self):
        return self.company_name

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class CustomOption(models.Model):
    """User-defined dropdown options for fields like department, location, category."""
    FIELD_CHOICES = [
        ('department', 'Department'),
        ('location', 'Location / Room'),
        ('instrument_category', 'Instrument Category'),
        ('maintenance_type', 'Maintenance Type'),
        ('spare_part_category', 'Spare Part Category'),
    ]
    field = models.CharField(max_length=50, choices=FIELD_CHOICES)
    label = models.CharField(max_length=200)
    value = models.CharField(max_length=200)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['field', 'sort_order', 'label']
        unique_together = [('field', 'value')]

    def __str__(self):
        return f'{self.get_field_display()}: {self.label}'


class UserPermission(models.Model):
    """Per-user module access granted by admin."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='permissions_profile')
    # Instruments
    instruments_view = models.BooleanField(default=True)
    instruments_edit = models.BooleanField(default=False)
    # Calibration
    calibration_view = models.BooleanField(default=True)
    calibration_edit = models.BooleanField(default=False)
    # Service / Maintenance
    service_view = models.BooleanField(default=True)
    service_edit = models.BooleanField(default=False)
    # Inventory
    inventory_view = models.BooleanField(default=True)
    inventory_edit = models.BooleanField(default=False)
    # Reports
    reports_view = models.BooleanField(default=False)

    def __str__(self):
        return f'Permissions: {self.user.username}'


class PDFTemplate(models.Model):
    REPORT_TYPES = [
        ('calibration', 'Calibration Report'),
        ('amc', 'AMC / Contract Report'),
        ('vendors', 'Vendor List'),
        ('service_month', 'Service Month Report'),
        ('audit', 'Audit Readiness Report'),
    ]
    PAPER_SIZES = [('A4', 'A4'), ('Letter', 'US Letter'), ('A3', 'A3')]
    ORIENTATIONS = [('portrait', 'Portrait'), ('landscape', 'Landscape')]

    report_type = models.CharField(max_length=30, choices=REPORT_TYPES, unique=True)

    # ── Content ──────────────────────────────────────────────
    title = models.CharField(max_length=200, blank=True)
    header_text = models.TextField(blank=True)
    footer_text = models.TextField(blank=True)
    confidential_text = models.CharField(max_length=200, blank=True, default='CONFIDENTIAL — FOR INTERNAL USE ONLY')

    # ── Visibility toggles ───────────────────────────────────
    include_logo = models.BooleanField(default=True)
    show_address = models.BooleanField(default=True)
    show_page_number = models.BooleanField(default=True)
    show_generated_date = models.BooleanField(default=True)
    show_watermark = models.BooleanField(default=False)
    watermark_text = models.CharField(max_length=100, blank=True, default='DRAFT')
    show_signature_block = models.BooleanField(default=False)
    signature_label = models.CharField(max_length=100, blank=True, default='Authorised Signatory')
    show_confidential_banner = models.BooleanField(default=False)
    show_table_borders = models.BooleanField(default=True)
    show_alt_row_color = models.BooleanField(default=True)

    # ── Style ────────────────────────────────────────────────
    primary_color = models.CharField(max_length=7, blank=True, default='')
    accent_color = models.CharField(max_length=7, blank=True, default='#f1f5f9')
    body_font_size = models.PositiveSmallIntegerField(default=8)

    # ── Page layout ──────────────────────────────────────────
    paper_size = models.CharField(max_length=10, choices=PAPER_SIZES, default='A4')
    orientation = models.CharField(max_length=10, choices=ORIENTATIONS, default='portrait')
    margin_top = models.FloatField(default=20.0)
    margin_bottom = models.FloatField(default=20.0)
    margin_left = models.FloatField(default=15.0)
    margin_right = models.FloatField(default=15.0)

    custom_columns = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'PDF Template: {self.get_report_type_display()}'
