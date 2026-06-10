from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog, User


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else None


def log_action(
    db: Session,
    user: User,
    request: Request,
    action: str,
    resource_type: str = '',
    resource_name: str = '',
    detail: str = '',
):
    db.add(AuditLog(
        user_id=user.id if user else None,
        action=action,
        resource_type=resource_type,
        resource_name=resource_name,
        detail=detail,
        ip_address=get_client_ip(request),
    ))
    db.commit()
