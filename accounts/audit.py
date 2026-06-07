from .models import AuditLog


def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(request, action, resource_type='', resource_name='', detail=''):
    user = request.user if request and request.user.is_authenticated else None
    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_name=resource_name,
        detail=detail,
        ip_address=get_client_ip(request) if request else None,
    )
