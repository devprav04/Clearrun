from django.urls import path
from . import views

urlpatterns = [
    path('company/', views.CompanySettingsView.as_view(), name='company-settings'),
    path('options/', views.CustomOptionListCreateView.as_view(), name='custom-options'),
    path('options/<int:pk>/', views.CustomOptionDetailView.as_view(), name='custom-option-detail'),
    path('permissions/', views.UserPermissionListView.as_view(), name='user-permissions'),
    path('permissions/<int:user_id>/', views.UserPermissionDetailView.as_view(), name='user-permission-detail'),
    path('pdf-templates/', views.PDFTemplateListView.as_view(), name='pdf-templates'),
    path('pdf-templates/<str:report_type>/', views.PDFTemplateDetailView.as_view(), name='pdf-template-detail'),
]
