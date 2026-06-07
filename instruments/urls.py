from django.urls import path
from . import views

urlpatterns = [
    path('vendors/', views.VendorListCreateView.as_view(), name='vendor-list'),
    path('vendors/<int:pk>/', views.VendorDetailView.as_view(), name='vendor-detail'),
    path('instruments/', views.InstrumentListCreateView.as_view(), name='instrument-list'),
    path('instruments/next-code/', views.InstrumentNextCodeView.as_view(), name='instrument-next-code'),
    path('instruments/export/', views.InstrumentExportView.as_view(), name='instrument-export'),
    path('instruments/import/', views.InstrumentImportView.as_view(), name='instrument-import'),
    path('instruments/qr/<str:qr_code>/', views.InstrumentByQRView.as_view(), name='instrument-by-qr'),
    path('instruments/<int:pk>/', views.InstrumentDetailView.as_view(), name='instrument-detail'),
]
