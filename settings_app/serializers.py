from rest_framework import serializers
from .models import CompanySettings, CustomOption, UserPermission, PDFTemplate


class CompanySettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanySettings
        fields = [
            'company_name', 'tagline', 'logo', 'logo_url', 'address', 'phone', 'email',
            'primary_color', 'company_code', 'department_code', 'sub_dept_code',
            'equipment_code_prefix', 'equipment_code_separator',
            'equipment_code_digits', 'updated_at',
        ]
        extra_kwargs = {'logo': {'write_only': True, 'required': False}}

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None


class CustomOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomOption
        fields = '__all__'


class UserPermissionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = UserPermission
        fields = '__all__'

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class PDFTemplateSerializer(serializers.ModelSerializer):
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)

    class Meta:
        model = PDFTemplate
        fields = '__all__'
