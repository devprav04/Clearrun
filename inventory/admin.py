from django.contrib import admin
from .models import SparePart, StockTransaction


@admin.register(SparePart)
class SparePartAdmin(admin.ModelAdmin):
    list_display = ['name', 'part_number', 'quantity_in_stock', 'minimum_stock_level', 'unit_cost', 'vendor']
    list_filter = ['vendor']
    search_fields = ['name', 'part_number']


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ['part', 'transaction_type', 'quantity', 'performed_by', 'created_at']
    list_filter = ['transaction_type']
