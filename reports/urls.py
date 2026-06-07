from django.urls import path
from . import views, pdf_views

urlpatterns = [
    path('dashboard/', views.dashboard_summary, name='dashboard'),
    path('mttr/', views.mttr_report, name='mttr'),
    path('downtime-cost/', views.downtime_cost_report, name='downtime-cost'),
    path('audit/', views.audit_readiness_report, name='audit'),
    path('manager/', views.manager_dashboard, name='manager-dashboard'),
    path('calendar/', views.calendar_events, name='calendar-events'),
    # PDF exports
    path('pdf/calibration/', pdf_views.pdf_calibration_report, name='pdf-calibration'),
    path('pdf/amc/', pdf_views.pdf_amc_report, name='pdf-amc'),
    path('pdf/vendors/', pdf_views.pdf_vendor_list, name='pdf-vendors'),
    path('pdf/service-month/', pdf_views.pdf_service_month_report, name='pdf-service-month'),
    path('pdf/audit/', pdf_views.pdf_audit_report, name='pdf-audit'),
    path('pdf/preview/<str:report_type>/', pdf_views.pdf_preview, name='pdf-preview'),
]
