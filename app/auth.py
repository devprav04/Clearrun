import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

from decouple import config
from jose import JWTError, jwt

SECRET_KEY = config('SECRET_KEY', default='cleanrun-insecure-secret-key')
ALGORITHM  = 'HS256'
ACCESS_TOKEN_EXPIRE_HOURS   = config('ACCESS_TOKEN_EXPIRE_HOURS', default=8, cast=int)
REFRESH_TOKEN_EXPIRE_DAYS   = config('REFRESH_TOKEN_EXPIRE_DAYS', default=7, cast=int)


# ── Django-compatible PBKDF2 password hashing ────────────────────────────────
def _pbkdf2(password: str, salt: str, iterations: int) -> str:
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    return base64.b64encode(dk).decode('ascii')


def verify_password(plain: str, encoded: str) -> bool:
    try:
        algorithm, iters, salt, stored = encoded.split('$', 3)
    except ValueError:
        return False
    if algorithm != 'pbkdf2_sha256':
        return False
    computed = _pbkdf2(plain, salt, int(iters))
    return hmac.compare_digest(computed, stored)


def hash_password(password: str) -> str:
    iterations = 720000
    salt = base64.b64encode(os.urandom(12)).decode('ascii').rstrip('=')
    h = _pbkdf2(password, salt, iterations)
    return f'pbkdf2_sha256${iterations}${salt}${h}'


# ── JWT ──────────────────────────────────────────────────────────────────────
def create_access_token(user_id: int, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({'sub': str(user_id), 'role': role, 'type': 'access', 'exp': exp}, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return jwt.encode({'sub': str(user_id), 'type': 'refresh', 'exp': exp}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
