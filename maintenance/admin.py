from django.contrib import admin
from .models import AMCContract, BreakdownTicket, MaintenanceLog, CalibrationRecord


@admin.register(AMCContract)
class AMCContractAdmin(admin.ModelAdmin):
    list_display = ['instrument', 'vendor', 'contract_type', 'start_date', 'end_date', 'status', 'contract_value']
    list_filter = ['status', 'contract_type']


@admin.register(BreakdownTicket)
class BreakdownTicketAdmin(admin.ModelAdmin):
    list_display = ['id', 'instrument', 'priority', 'status', 'reported_by', 'assigned_to', 'reported_at']
    list_filter = ['status', 'priority']


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['instrument', 'maintenance_type', 'performed_by', 'performed_at', 'labor_cost', 'parts_cost']
    list_filter = ['maintenance_type']


@admin.register(CalibrationRecord)
class CalibrationRecordAdmin(admin.ModelAdmin):
    list_display = ['instrument', 'calibration_date', 'next_due_date', 'status', 'calibrated_by']
    list_filter = ['status']
