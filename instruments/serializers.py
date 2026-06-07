from rest_framework import serializers
from .models import Instrument, Vendor


class VendorSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    instruments_count = serializers.SerializerMethodField()
    active_amc_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'

    def get_instruments_count(self, obj):
        return obj.instruments.count()

    def get_active_amc_count(self, obj):
        try:
            return obj.amccontract_set.filter(status='active').count()
        except Exception:
            return 0


class InstrumentSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    manufacturer = serializers.CharField(required=False, allow_blank=True, default='')
    installation_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Instrument
        fields = '__all__'
