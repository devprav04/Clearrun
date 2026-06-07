from django.db import models
from django.conf import settings
from django.utils import timezone
from instruments.models import Instrument, Vendor


class AMCContract(models.Model):
    class ContractType(models.TextChoices):
        COMPREHENSIVE = 'comprehensive', 'Comprehensive'
        NON_COMPREHENSIVE = 'non_comprehensive', 'Non-Comprehensive'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        PENDING_RENEWAL = 'pending_renewal', 'Pending Renewal'

    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE, related_name='amc_contracts')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='amc_contracts')
    contract_type = models.CharField(max_length=20, choices=ContractType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    contract_value = models.DecimalField(max_digits=12, decimal_places=2)
    contract_document = models.FileField(upload_to='amc_contracts/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def days_until_expiry(self):
        return (self.end_date - timezone.now().date()).days

    def __str__(self):
        return f"AMC: {self.instrument.name} - {self.vendor.name} (expires {self.end_date})"


class BreakdownTicket(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        ASSIGNED = 'assigned', 'Assigned'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    ticket_id = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE, related_name='breakdown_tickets')
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reported_tickets')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    description = models.TextField()
    resolution_notes = models.TextField(blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def mttr_hours(self):
        if self.resolved_at and self.reported_at:
            delta = self.resolved_at - self.reported_at
            return round(delta.total_seconds() / 3600, 2)
        return None

    def __str__(self):
        return f"Ticket #{self.pk} - {self.instrument.name} ({self.status})"


class MaintenanceLog(models.Model):
    class MaintenanceType(models.TextChoices):
        PREVENTIVE = 'preventive', 'Preventive'
        CORRECTIVE = 'corrective', 'Corrective'
        CALIBRATION = 'calibration', 'Calibration'
        AMC_VISIT = 'amc_visit', 'AMC Vendor Visit'

    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE, related_name='maintenance_logs')
    ticket = models.ForeignKey(BreakdownTicket, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_logs')
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='maintenance_logs')
    maintenance_type = models.CharField(max_length=15, choices=MaintenanceType.choices)
    description = models.TextField()
    parts_used = models.TextField(blank=True)
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    performed_at = models.DateTimeField()
    next_maintenance_due = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_maintenance_type_display()} on {self.instrument.name} at {self.performed_at.date()}"


class CalibrationRecord(models.Model):
    class Status(models.TextChoices):
        VALID = 'valid', 'Valid'
        EXPIRED = 'expired', 'Expired'
        DUE_SOON = 'due_soon', 'Due Soon'

    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE, related_name='calibration_records')
    calibrated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='calibrations')
    calibrated_by_vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='calibrations')
    calibration_date = models.DateField()
    next_due_date = models.DateField()
    certificate = models.FileField(upload_to='calibration_certs/', blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.VALID)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Calibration: {self.instrument.name} on {self.calibration_date}"

