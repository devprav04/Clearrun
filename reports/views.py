from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.db.models import Sum
from datetime import timedelta, date
from instruments.models import Instrument
from maintenance.models import BreakdownTicket, MaintenanceLog, CalibrationRecord, AMCContract


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    instruments = Instrument.objects.all()
    return Response({
        'instrument_status': {
            'operational': instruments.filter(status='operational').count(),
            'calibrating': instruments.filter(status='calibrating').count(),
            'broken_down': instruments.filter(status='broken_down').count(),
            'scheduled_maintenance': instruments.filter(status='scheduled_maintenance').count(),
            'out_of_service': instruments.filter(status='out_of_service').count(),
            'total': instruments.count(),
        },
        'open_breakdown_tickets': BreakdownTicket.objects.filter(
            status__in=['open', 'assigned', 'in_progress']
        ).count(),
        'amc_expiring_in_30_days': AMCContract.objects.filter(
            end_date__lte=date.today() + timedelta(days=30),
            end_date__gte=date.today(),
            status='active',
        ).count(),
        'low_stock_parts': _low_stock_parts(),
        'calibration_due_soon': CalibrationRecord.objects.filter(
            next_due_date__lte=date.today() + timedelta(days=30),
            next_due_date__gte=date.today(),
        ).count(),
    })


def _low_stock_parts():
    from inventory.models import SparePart
    parts = SparePart.objects.filter(
        quantity_in_stock__lte=models.F('minimum_stock_level')
    ).select_related('vendor').prefetch_related('compatible_instruments')[:10]
    return [
        {
            'id': p.id,
            'name': p.name,
            'part_number': p.part_number,
            'quantity_in_stock': p.quantity_in_stock,
            'minimum_stock_level': p.minimum_stock_level,
            'instruments': [i.name for i in p.compatible_instruments.all()],
        }
        for p in parts
    ]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mttr_report(request):
    resolved = BreakdownTicket.objects.filter(
        status='resolved', resolved_at__isnull=False
    ).select_related('instrument')

    by_instrument = {}
    for t in resolved:
        hours = t.mttr_hours()
        if hours is None:
            continue
        name = t.instrument.name
        if name not in by_instrument:
            by_instrument[name] = {'instrument_name': name, 'total': 0, 'count': 0}
        by_instrument[name]['total'] += hours
        by_instrument[name]['count'] += 1

    data = [
        {'instrument_name': v['instrument_name'], 'mttr_hours': round(v['total'] / v['count'], 2)}
        for v in by_instrument.values()
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def downtime_cost_report(request):
    logs = MaintenanceLog.objects.select_related('instrument').all()
    by_instrument = {}
    for log in logs:
        name = log.instrument.name
        if name not in by_instrument:
            by_instrument[name] = {'instrument_name': name, 'downtime_cost': 0}
        by_instrument[name]['downtime_cost'] += float(log.labor_cost) + float(log.parts_cost)

    return Response(list(by_instrument.values()))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_readiness_report(request):
    today = date.today()
    instruments = Instrument.objects.prefetch_related(
        'calibration_records', 'amc_contracts'
    ).all()

    data = []
    for inst in instruments:
        latest_cal = inst.calibration_records.order_by('-calibration_date').first()
        active_amc = inst.amc_contracts.filter(status='active').order_by('-end_date').first()
        latest_maint = inst.maintenance_logs.order_by('-performed_at').first()

        cal_ok = latest_cal and latest_cal.status == 'valid' and latest_cal.next_due_date >= today
        amc_ok = bool(active_amc and active_amc.end_date >= today)

        score = 0
        if cal_ok: score += 50
        if amc_ok: score += 30
        if latest_maint: score += 20

        data.append({
            'instrument_name': inst.name,
            'calibration_status': latest_cal.status if latest_cal else 'no_record',
            'calibration_ok': cal_ok,
            'amc_status': active_amc.status if active_amc else 'none',
            'amc_active': amc_ok,
            'last_maintenance_date': str(latest_maint.performed_at.date()) if latest_maint else None,
            'compliance_score': score,
            'audit_ready': score >= 80,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def manager_dashboard(request):
    if not request.user.is_manager:
        raise PermissionDenied()

    amc_value = AMCContract.objects.filter(status='active').aggregate(
        total=Sum('contract_value')
    )['total'] or 0

    pending_renewals = AMCContract.objects.filter(
        end_date__lte=date.today() + timedelta(days=30), status='active'
    ).count()

    total_cal = CalibrationRecord.objects.count()
    valid_cal = CalibrationRecord.objects.filter(status='valid').count()
    compliance = round((valid_cal / total_cal) * 100, 1) if total_cal else 100

    return Response({
        'active_amc_value': float(amc_value),
        'amc_pending_renewals': pending_renewals,
        'compliance_percentage': compliance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_events(request):
    today = date.today()
    start = today - timedelta(days=30)
    end = today + timedelta(days=90)
    events = []

    for amc in AMCContract.objects.filter(
        end_date__gte=start, end_date__lte=end, status='active'
    ).select_related('instrument', 'vendor'):
        days = (amc.end_date - today).days
        events.append({
            'id': f'amc-{amc.pk}',
            'type': 'amc_expiry',
            'title': f'AMC Expiry: {amc.instrument.name}',
            'date': str(amc.end_date),
            'detail': f'{amc.vendor.name} · {amc.get_contract_type_display()}',
            'urgent': days <= 30,
            'color': 'red' if days <= 7 else ('orange' if days <= 30 else 'yellow'),
        })

    for cal in CalibrationRecord.objects.filter(
        next_due_date__gte=start, next_due_date__lte=end
    ).select_related('instrument'):
        days = (cal.next_due_date - today).days
        events.append({
            'id': f'cal-{cal.pk}',
            'type': 'calibration_due',
            'title': f'Calibration Due: {cal.instrument.name}',
            'date': str(cal.next_due_date),
            'detail': cal.instrument.location,
            'urgent': days <= 14,
            'color': 'purple' if days > 14 else ('orange' if days > 0 else 'red'),
        })

    for log in MaintenanceLog.objects.filter(
        next_maintenance_due__gte=start, next_maintenance_due__lte=end
    ).select_related('instrument'):
        events.append({
            'id': f'maint-{log.pk}',
            'type': 'maintenance_due',
            'title': f'Maintenance Due: {log.instrument.name}',
            'date': str(log.next_maintenance_due),
            'detail': log.get_maintenance_type_display(),
            'urgent': (log.next_maintenance_due - today).days <= 7,
            'color': 'blue',
        })

    for ticket in BreakdownTicket.objects.filter(
        status__in=['open', 'assigned', 'in_progress']
    ).select_related('instrument'):
        events.append({
            'id': f'ticket-{ticket.pk}',
            'type': 'breakdown',
            'title': f'Open Ticket: {ticket.instrument.name}',
            'date': str(ticket.reported_at.date()),
            'detail': ticket.get_priority_display() + ' priority',
            'urgent': ticket.priority in ('high', 'critical'),
            'color': 'red' if ticket.priority == 'critical' else 'orange',
        })

    events.sort(key=lambda e: e['date'])
    return Response(events)
