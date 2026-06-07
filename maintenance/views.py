from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from instruments.models import Instrument
from .models import AMCContract, BreakdownTicket, MaintenanceLog, CalibrationRecord
from .serializers import (
    AMCContractSerializer, BreakdownTicketSerializer,
    MaintenanceLogSerializer, CalibrationRecordSerializer
)
from accounts.audit import log_action


class AMCContractListCreateView(generics.ListCreateAPIView):
    queryset = AMCContract.objects.select_related('instrument', 'vendor').all()
    serializer_class = AMCContractSerializer

    def perform_create(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'create', 'AMC Contract', obj.instrument.name,
                   f'AMC with {obj.vendor.name} — {obj.get_contract_type_display()} — expires {obj.end_date}')


class AMCContractDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AMCContract.objects.all()
    serializer_class = AMCContractSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'update', 'AMC Contract', obj.instrument.name,
                   f'Updated AMC — status: {obj.status}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', 'AMC Contract', instance.instrument.name,
                   f'Deleted AMC with {instance.vendor.name}')
        instance.delete()


class BreakdownTicketListCreateView(generics.ListCreateAPIView):
    serializer_class = BreakdownTicketSerializer

    def get_queryset(self):
        user = self.request.user
        qs = BreakdownTicket.objects.select_related('instrument', 'reported_by', 'assigned_to')
        if user.role == 'technician':
            return qs.filter(assigned_to=user)
        return qs.all()

    def perform_create(self, serializer):
        ticket = serializer.save(reported_by=self.request.user)
        instrument = ticket.instrument
        instrument.status = Instrument.Status.OUT_OF_SERVICE
        instrument.save()
        log_action(self.request, 'ticket', 'Breakdown Ticket', instrument.name,
                   f'Reported breakdown — {ticket.get_priority_display()} priority: {ticket.description[:100]}')
        # Send email to vendor AMC contact if available
        try:
            from maintenance.models import AMCContract
            from django.core.mail import send_mail
            from django.conf import settings as django_settings
            amc = AMCContract.objects.filter(instrument=instrument, status='active').order_by('-end_date').first()
            if amc and amc.vendor and amc.vendor.email:
                company_name = 'CleanRun Lab'
                try:
                    from settings_app.models import CompanySettings
                    cs = CompanySettings.objects.first()
                    if cs and cs.company_name:
                        company_name = cs.company_name
                except Exception:
                    pass
                subject = f'[Service Call] Breakdown — {instrument.name} | {company_name}'
                body = (
                    f'Dear {amc.vendor.contact_person or amc.vendor.name},\n\n'
                    f'We are raising a service call for the following instrument:\n\n'
                    f'  Instrument : {instrument.name}\n'
                    f'  Model      : {instrument.model}\n'
                    f'  Serial No  : {instrument.serial_number}\n'
                    f'  Location   : {instrument.location}\n'
                    f'  Priority   : {ticket.get_priority_display()}\n'
                    f'  Description: {ticket.description}\n\n'
                    f'Please arrange for a service engineer at the earliest.\n\n'
                    f'Reported by: {self.request.user.get_full_name() or self.request.user.username}\n'
                    f'Date: {ticket.reported_at.strftime("%d %b %Y, %H:%M")}\n\n'
                    f'Regards,\n{company_name}'
                )
                send_mail(subject, body, django_settings.DEFAULT_FROM_EMAIL, [amc.vendor.email],
                          fail_silently=True)
        except Exception:
            pass


class BreakdownTicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BreakdownTicket.objects.all()
    serializer_class = BreakdownTicketSerializer

    def perform_update(self, serializer):
        ticket = serializer.save()
        if ticket.status == BreakdownTicket.Status.RESOLVED and not ticket.resolved_at:
            ticket.resolved_at = timezone.now()
            ticket.save()
        log_action(self.request, 'update', 'Breakdown Ticket', ticket.instrument.name,
                   f'Ticket #{ticket.pk} → {ticket.get_status_display()}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', 'Breakdown Ticket', instance.instrument.name,
                   f'Deleted ticket #{instance.pk}')
        instance.delete()


class MaintenanceLogListCreateView(generics.ListCreateAPIView):
    queryset = MaintenanceLog.objects.select_related('instrument', 'performed_by').all()
    serializer_class = MaintenanceLogSerializer

    def perform_create(self, serializer):
        obj = serializer.save(performed_by=self.request.user)
        log_action(self.request, 'create', 'Maintenance Log', obj.instrument.name,
                   f'Logged {obj.get_maintenance_type_display()} on {obj.performed_at.date()}')


class MaintenanceLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'update', 'Maintenance Log', obj.instrument.name,
                   f'Updated maintenance log #{obj.pk}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', 'Maintenance Log', instance.instrument.name,
                   f'Deleted maintenance log #{instance.pk}')
        instance.delete()


class CalibrationRecordListCreateView(generics.ListCreateAPIView):
    queryset = CalibrationRecord.objects.select_related('instrument', 'calibrated_by').all()
    serializer_class = CalibrationRecordSerializer

    def perform_create(self, serializer):
        obj = serializer.save(calibrated_by=self.request.user)
        log_action(self.request, 'create', 'Calibration', obj.instrument.name,
                   f'Calibrated on {obj.calibration_date} — next due {obj.next_due_date}')


class CalibrationRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CalibrationRecord.objects.all()
    serializer_class = CalibrationRecordSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        log_action(self.request, 'update', 'Calibration', obj.instrument.name,
                   f'Updated calibration record #{obj.pk}')

    def perform_destroy(self, instance):
        log_action(self.request, 'delete', 'Calibration', instance.instrument.name,
                   f'Deleted calibration record #{instance.pk}')
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expiring_amc_contracts(request):
    from datetime import date, timedelta
    today = date.today()
    threshold = today + timedelta(days=30)
    contracts = AMCContract.objects.filter(end_date__lte=threshold, end_date__gte=today, status='active')
    data = AMCContractSerializer(contracts, many=True).data
    return Response(data)
