from rest_framework import serializers
from .models import SparePart, StockTransaction


class SparePartSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = SparePart
        fields = '__all__'


class StockTransactionSerializer(serializers.ModelSerializer):
    part_name = serializers.CharField(source='part.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = StockTransaction
        fields = '__all__'
