from django.urls import path
from . import views

urlpatterns = [
    path('amc/', views.AMCContractListCreateView.as_view(), name='amc-list'),
    path('amc/<int:pk>/', views.AMCContractDetailView.as_view(), name='amc-detail'),
    path('amc/expiring/', views.expiring_amc_contracts, name='amc-expiring'),
    path('tickets/', views.BreakdownTicketListCreateView.as_view(), name='ticket-list'),
    path('tickets/<int:pk>/', views.BreakdownTicketDetailView.as_view(), name='ticket-detail'),
    path('logs/', views.MaintenanceLogListCreateView.as_view(), name='log-list'),
    path('logs/<int:pk>/', views.MaintenanceLogDetailView.as_view(), name='log-detail'),
    path('calibration/', views.CalibrationRecordListCreateView.as_view(), name='calibration-list'),
    path('calibration/<int:pk>/', views.CalibrationRecordDetailView.as_view(), name='calibration-detail'),
]
