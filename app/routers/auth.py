from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from jose import JWTError
from sqlalchemy.orm import Session

from ..audit import log_action
from ..auth import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from ..deps import get_current_user, get_db
from ..models import User
from ..schemas import PasswordChange, RefreshRequest, TokenResponse, UserOut, UserUpdate
from .users import _build_user_out, _save_profile_picture

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login/', response_model=TokenResponse)
def login(request: Request, body: dict, db: Session = Depends(get_db)):
    username = body.get('username', '')
    password = body.get('password', '')
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials.')
    user.last_login = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    db.commit()
    log_action(db, user, request, 'login', 'Auth', username, 'User logged in')
    return TokenResponse(
        access=create_access_token(user.id, user.role),
        refresh=create_refresh_token(user.id),
        user=_build_user_out(user, request),
    )


@router.post('/token/refresh/')
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh)
        if payload.get('type') != 'refresh':
            raise ValueError
        user_id = int(payload['sub'])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid refresh token.')
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found.')
    return {'access': create_access_token(user.id, user.role)}


@router.get('/me/', response_model=UserOut)
def me(request: Request, current_user: User = Depends(get_current_user)):
    return _build_user_out(current_user, request)


@router.patch('/me/', response_model=UserOut)
def update_me(
    request: Request,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user, request)


@router.post('/me/change-password/')
def change_password(
    request: Request,
    body: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password):
        raise HTTPException(status_code=400, detail='Current password is incorrect.')
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters.')
    current_user.password = hash_password(body.new_password)
    db.commit()
    log_action(db, current_user, request, 'update', 'User', current_user.username, 'Password changed')
    return {'detail': 'Password changed successfully.'}


@router.post('/me/upload-avatar/')
def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = _save_profile_picture(file, current_user.id)
    current_user.profile_picture = path
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user, request)
