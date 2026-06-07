from django.contrib import admin
from .models import Instrument, Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone']
    search_fields = ['name', 'contact_person']


@admin.register(Instrument)
class InstrumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'serial_number', 'model', 'status', 'location', 'vendor']
    list_filter = ['status', 'location']
    search_fields = ['name', 'serial_number', 'model']
    list_editable = ['status']
