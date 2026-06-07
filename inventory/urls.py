from django.urls import path
from . import views

urlpatterns = [
    path('parts/', views.SparePartListCreateView.as_view(), name='part-list'),
    path('parts/<int:pk>/', views.SparePartDetailView.as_view(), name='part-detail'),
    path('parts/low-stock/', views.low_stock_parts, name='low-stock'),
    path('transactions/', views.StockTransactionListCreateView.as_view(), name='transaction-list'),
]
