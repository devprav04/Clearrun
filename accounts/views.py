from rest_framework import generics, permissions, status, filters
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .audit import log_action
from .models import User, AuditLog
from .serializers import (
    UserSerializer, UserCreateSerializer,
    CustomTokenObtainPairSerializer, PasswordChangeSerializer, AuditLogSerializer
)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get('username', '')
            try:
                user = User.objects.get(username=username)
                AuditLog.objects.create(
                    user=user, action='login', resource_type='Auth',
                    resource_name=username, detail='User logged in',
                    ip_address=request.META.get('REMOTE_ADDR'))
            except User.DoesNotExist:
                pass
        return response


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('id')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        if self.request.user.role != 'manager':
            raise PermissionDenied('Only managers can create users.')
        user = serializer.save()
        log_action(self.request, 'create', 'User', user.username,
                   f'Created {user.get_role_display()} account for {user.get_full_name() or user.username}')


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        if self.request.user.role != 'manager':
            raise PermissionDenied('Only managers can edit other users.')
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'manager':
            raise PermissionDenied('Only managers can delete users.')
        if instance.pk == self.request.user.pk:
            raise ValidationError('You cannot delete your own account.')
        log_action(self.request, 'delete', 'User', instance.username,
                   f'Deleted user {instance.get_full_name() or instance.username}')
        instance.delete()


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        log_action(request, 'update', 'User', request.user.username, 'Password changed')
        return Response({'detail': 'Password changed successfully.'})


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'user__first_name', 'resource_type', 'resource_name', 'action']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        if self.request.user.role != 'manager':
            raise PermissionDenied()
        qs = AuditLog.objects.select_related('user').all()
        user_id = self.request.query_params.get('user')
        action = self.request.query_params.get('action')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if action:
            qs = qs.filter(action=action)
        return qs
