from django.db import models
from django.conf import settings
from instruments.models import Instrument, Vendor


class SparePart(models.Model):
    name = models.CharField(max_length=200)
    part_number = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    compatible_instruments = models.ManyToManyField(Instrument, blank=True, related_name='spare_parts')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_in_stock = models.PositiveIntegerField(default=0)
    minimum_stock_level = models.PositiveIntegerField(default=2)
    location = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_low_stock(self):
        return self.quantity_in_stock <= self.minimum_stock_level

    def __str__(self):
        return f"{self.name} (#{self.part_number}) - Qty: {self.quantity_in_stock}"


class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        IN = 'in', 'Stock In'
        OUT = 'out', 'Stock Out'
        ADJUSTMENT = 'adjustment', 'Adjustment'

    part = models.ForeignKey(SparePart, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=15, choices=TransactionType.choices)
    quantity = models.IntegerField()
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reference = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        part = self.part
        if self.transaction_type == self.TransactionType.IN:
            part.quantity_in_stock += self.quantity
        elif self.transaction_type == self.TransactionType.OUT:
            part.quantity_in_stock -= self.quantity
        else:
            part.quantity_in_stock = self.quantity
        part.save()

    def __str__(self):
        return f"{self.get_transaction_type_display()}: {self.part.name} x{self.quantity}"

