from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from .auth import decode_token
from .database import SessionLocal
from .models import User

bearer = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = decode_token(credentials.credentials)
        if payload.get('type') != 'access':
            raise credentials_exc
        user_id = int(payload['sub'])
    except (JWTError, KeyError, ValueError):
        raise credentials_exc

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise credentials_exc
    return user


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if not (current_user.role == 'manager' or current_user.is_superuser):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Manager access required.')
    return current_user
