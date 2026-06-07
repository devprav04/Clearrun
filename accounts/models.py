from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        LAB_EMPLOYEE = 'employee', 'Lab Employee'
        TECHNICIAN = 'technician', 'Maintenance Technician'
        MANAGER = 'manager', 'Lab Manager / Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.LAB_EMPLOYEE)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)

    @property
    def is_manager(self):
        return self.role == self.Role.MANAGER

    @property
    def is_technician(self):
        return self.role == self.Role.TECHNICIAN

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'create', 'Created'
        UPDATE = 'update', 'Updated'
        DELETE = 'delete', 'Deleted'
        LOGIN  = 'login',  'Logged In'
        LOGOUT = 'logout', 'Logged Out'
        CHECKOUT = 'checkout', 'Part Checked Out'
        TICKET   = 'ticket',   'Ticket Reported'

    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=Action.choices)
    resource_type = models.CharField(max_length=100, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)
    detail = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} {self.action} {self.resource_type} @ {self.timestamp:%Y-%m-%d %H:%M}"

