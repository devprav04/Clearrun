from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.UserListCreateView.as_view(), name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('me/', views.MeView.as_view(), name='me'),
    path('me/change-password/', views.PasswordChangeView.as_view(), name='change-password'),
    path('audit-log/', views.AuditLogListView.as_view(), name='audit-log'),
]
