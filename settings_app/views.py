from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status, generics
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import CompanySettings, CustomOption, UserPermission, PDFTemplate
from .serializers import (
    CompanySettingsSerializer, CustomOptionSerializer,
    UserPermissionSerializer, PDFTemplateSerializer,
)


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'manager'


class IsManagerOrPublicRead(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.role == 'manager'


class CompanySettingsView(APIView):
    permission_classes = [IsManagerOrPublicRead]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        obj = CompanySettings.get()
        return Response(CompanySettingsSerializer(obj, context={'request': request}).data)

    def patch(self, request):
        obj = CompanySettings.get()
        serializer = CompanySettingsSerializer(obj, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomOptionListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomOptionSerializer
    permission_classes = [IsManagerOrPublicRead]

    def get_queryset(self):
        qs = CustomOption.objects.filter(is_active=True)
        field = self.request.query_params.get('field')
        if field:
            qs = qs.filter(field=field)
        return qs


class CustomOptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomOption.objects.all()
    serializer_class = CustomOptionSerializer
    permission_classes = [IsManager]


class UserPermissionListView(generics.ListAPIView):
    serializer_class = UserPermissionSerializer
    permission_classes = [IsManager]

    def get_queryset(self):
        return UserPermission.objects.select_related('user').all()


class UserPermissionDetailView(APIView):
    permission_classes = [IsManager]

    def get(self, request, user_id):
        from accounts.models import User
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        perm, _ = UserPermission.objects.get_or_create(user=user)
        return Response(UserPermissionSerializer(perm).data)

    def patch(self, request, user_id):
        from accounts.models import User
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)
        perm, _ = UserPermission.objects.get_or_create(user=user)
        serializer = UserPermissionSerializer(perm, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class PDFTemplateListView(generics.ListAPIView):
    serializer_class = PDFTemplateSerializer
    permission_classes = [IsManager]
    queryset = PDFTemplate.objects.all()


class PDFTemplateDetailView(APIView):
    permission_classes = [IsManager]

    def get(self, request, report_type):
        obj, _ = PDFTemplate.objects.get_or_create(report_type=report_type)
        return Response(PDFTemplateSerializer(obj).data)

    def patch(self, request, report_type):
        obj, _ = PDFTemplate.objects.get_or_create(report_type=report_type)
        serializer = PDFTemplateSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
