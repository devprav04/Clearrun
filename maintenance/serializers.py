from rest_framework import serializers
from .models import AMCContract, BreakdownTicket, MaintenanceLog, CalibrationRecord


class AMCContractSerializer(serializers.ModelSerializer):
    days_until_expiry = serializers.SerializerMethodField()
    instrument_name = serializers.CharField(source='instrument.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = AMCContract
        fields = '__all__'

    def get_days_until_expiry(self, obj):
        return obj.days_until_expiry()


class BreakdownTicketSerializer(serializers.ModelSerializer):
    instrument_name = serializers.CharField(source='instrument.name', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    mttr_hours = serializers.SerializerMethodField()

    class Meta:
        model = BreakdownTicket
        fields = '__all__'

    def get_mttr_hours(self, obj):
        return obj.mttr_hours()


class MaintenanceLogSerializer(serializers.ModelSerializer):
    instrument_name = serializers.CharField(source='instrument.name', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = MaintenanceLog
        fields = '__all__'


class CalibrationRecordSerializer(serializers.ModelSerializer):
    instrument_name = serializers.CharField(source='instrument.name', read_only=True)
    calibrated_by_name = serializers.SerializerMethodField()
    calibrated_by_vendor_name = serializers.CharField(source='calibrated_by_vendor.name', read_only=True)

    class Meta:
        model = CalibrationRecord
        fields = '__all__'

    def get_calibrated_by_name(self, obj):
        if obj.calibrated_by:
            return obj.calibrated_by.get_full_name() or obj.calibrated_by.username
        if obj.calibrated_by_vendor:
            return obj.calibrated_by_vendor.name
        return '—'
