import os
import shutil
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from ..audit import log_action
from ..auth import hash_password
from ..deps import get_current_user, get_db, require_manager
from ..models import User
from ..schemas import UserCreate, UserOut, UserUpdate, paginated
from decouple import config

router = APIRouter(prefix='/api/auth', tags=['users'])

MEDIA_ROOT = config('MEDIA_ROOT', default='media')

SERVICE_TYPE_LABELS = {
    'calibration': 'Calibration',
    'amc': 'AMC / Maintenance',
    'supply': 'Parts Supply',
    'repair': 'Repair & Service',
    'installation': 'Installation',
    'multiple': 'Multiple Services',
}

ROLE_LABELS = {
    'employee': 'Lab Employee',
    'technician': 'Maintenance Technician',
    'manager': 'Lab Manager / Admin',
}


def _build_user_out(user: User, request: Request) -> UserOut:
    pic_url = None
    if user.profile_picture:
        pic_url = str(request.base_url) + f'media/{user.profile_picture}'
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        department=user.department,
        employee_id=user.employee_id,
        profile_picture=user.profile_picture,
        profile_picture_url=pic_url,
    )


def _save_profile_picture(file: UploadFile, user_id: int) -> str:
    ext = os.path.splitext(file.filename or '')[1] or '.jpg'
    filename = f'profiles/{user_id}_{uuid.uuid4().hex}{ext}'
    dest = os.path.join(MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return filename


@router.get('/users/', response_model=dict)
def list_users(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(User)
    total = q.count()
    users = q.order_by(User.id).offset((page - 1) * page_size).limit(page_size).all()
    return paginated([_build_user_out(u, request) for u in users], total)


@router.post('/users/', response_model=UserOut, status_code=201)
def create_user(
    request: Request,
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail='Username already exists.')
    user = User(
        username=body.username,
        email=body.email,
        password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        role=body.role,
        phone=body.phone,
        department=body.department,
        employee_id=body.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, current_user, request, 'create', 'User', user.username,
               f'Created {ROLE_LABELS.get(user.role, user.role)} account for {user.first_name or user.username}')
    return _build_user_out(user, request)


@router.get('/users/{user_id}/', response_model=UserOut)
def get_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')
    return _build_user_out(user, request)


@router.patch('/users/{user_id}/', response_model=UserOut)
def update_user(
    user_id: int,
    request: Request,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return _build_user_out(user, request)


@router.delete('/users/{user_id}/', status_code=204)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found.')
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail='Cannot delete your own account.')
    log_action(db, current_user, request, 'delete', 'User', user.username,
               f'Deleted user {user.first_name or user.username}')
    db.delete(user)
    db.commit()


@router.get('/audit-log/', response_model=dict)
def audit_log(
    page: int = 1,
    page_size: int = 20,
    user: int = None,
    action: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    from ..models import AuditLog
    from ..schemas import AuditLogOut
    from sqlalchemy import or_

    ACTION_LABELS = {
        'create': 'Created', 'update': 'Updated', 'delete': 'Deleted',
        'login': 'Logged In', 'logout': 'Logged Out',
        'checkout': 'Part Checked Out', 'ticket': 'Ticket Reported',
    }

    q = db.query(AuditLog)
    if user:
        q = q.filter(AuditLog.user_id == user)
    if action:
        q = q.filter(AuditLog.action == action)
    if search:
        like = f'%{search}%'
        q = q.filter(or_(
            AuditLog.resource_name.ilike(like),
            AuditLog.resource_type.ilike(like),
            AuditLog.detail.ilike(like),
        ))
    q = q.order_by(AuditLog.timestamp.desc())
    total = q.count()
    logs = q.offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for log in logs:
        u = log.user
        name = None
        if u:
            full = f'{u.first_name} {u.last_name}'.strip()
            name = full or u.username
        results.append(AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            user_name=name or 'System',
            action=log.action,
            action_display=ACTION_LABELS.get(log.action, log.action),
            resource_type=log.resource_type,
            resource_name=log.resource_name,
            detail=log.detail,
            ip_address=log.ip_address,
            timestamp=log.timestamp,
        ))
    return paginated(results, total)
