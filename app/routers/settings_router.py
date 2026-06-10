import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db, require_manager
from ..models import CompanySettings, CustomOption, PDFTemplate, User, UserPermission
from ..schemas import (
    CompanySettingsOut, CompanySettingsUpdate,
    CustomOptionCreate, CustomOptionOut,
    PDFTemplateOut, PDFTemplateUpdate,
    UserPermissionOut, UserPermissionUpdate,
)
from decouple import config

router = APIRouter(prefix='/api/settings', tags=['settings'])
MEDIA_ROOT = config('MEDIA_ROOT', default='media')


# ── Company Settings ──────────────────────────────────────────────────────────
def _cs_out(cs: CompanySettings, request: Request) -> CompanySettingsOut:
    out = CompanySettingsOut.model_validate(cs)
    if cs.logo:
        out.logo_url = str(request.base_url) + f'media/{cs.logo}'
    return out


@router.get('/company/', response_model=CompanySettingsOut)
def get_company(request: Request, db: Session = Depends(get_db)):
    cs = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not cs:
        cs = CompanySettings(id=1)
        db.add(cs)
        db.commit()
        db.refresh(cs)
    return _cs_out(cs, request)


@router.patch('/company/', response_model=CompanySettingsOut)
def update_company(
    request: Request, body: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    cs = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not cs:
        cs = CompanySettings(id=1)
        db.add(cs)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(cs, field, value)
    db.commit()
    db.refresh(cs)
    return _cs_out(cs, request)


@router.post('/company/logo/')
def upload_logo(
    request: Request, file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    ext = os.path.splitext(file.filename or '')[1] or '.png'
    filename = f'company/logo{ext}'
    dest = os.path.join(MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    cs = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not cs:
        cs = CompanySettings(id=1)
        db.add(cs)
    cs.logo = filename
    db.commit()
    db.refresh(cs)
    return _cs_out(cs, request)


# ── Custom Options ────────────────────────────────────────────────────────────
@router.get('/options/', response_model=list)
def list_options(field: str = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(CustomOption).filter(CustomOption.is_active == True)
    if field:
        q = q.filter(CustomOption.field == field)
    return [CustomOptionOut.model_validate(o) for o in q.all()]


@router.post('/options/', response_model=CustomOptionOut, status_code=201)
def create_option(body: CustomOptionCreate, db: Session = Depends(get_db), _: User = Depends(require_manager)):
    opt = CustomOption(**body.model_dump())
    db.add(opt)
    db.commit()
    db.refresh(opt)
    return CustomOptionOut.model_validate(opt)


@router.delete('/options/{option_id}/', status_code=204)
def delete_option(option_id: int, db: Session = Depends(get_db), _: User = Depends(require_manager)):
    opt = db.query(CustomOption).filter(CustomOption.id == option_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail='Option not found.')
    db.delete(opt)
    db.commit()


# ── User Permissions ──────────────────────────────────────────────────────────
@router.get('/permissions/', response_model=list)
def list_permissions(db: Session = Depends(get_db), _: User = Depends(require_manager)):
    return [UserPermissionOut.model_validate(p) for p in db.query(UserPermission).all()]


@router.get('/permissions/{user_id}/', response_model=UserPermissionOut)
def get_permission(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_manager)):
    perm = db.query(UserPermission).filter(UserPermission.user_id == user_id).first()
    if not perm:
        perm = UserPermission(user_id=user_id)
        db.add(perm)
        db.commit()
        db.refresh(perm)
    return UserPermissionOut.model_validate(perm)


@router.patch('/permissions/{user_id}/', response_model=UserPermissionOut)
def update_permission(user_id: int, body: UserPermissionUpdate, db: Session = Depends(get_db), _: User = Depends(require_manager)):
    perm = db.query(UserPermission).filter(UserPermission.user_id == user_id).first()
    if not perm:
        perm = UserPermission(user_id=user_id)
        db.add(perm)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(perm, field, value)
    db.commit()
    db.refresh(perm)
    return UserPermissionOut.model_validate(perm)


# ── PDF Templates ─────────────────────────────────────────────────────────────
@router.get('/pdf-templates/', response_model=list)
def list_pdf_templates(db: Session = Depends(get_db), _: User = Depends(require_manager)):
    return [PDFTemplateOut.model_validate(t) for t in db.query(PDFTemplate).all()]


@router.get('/pdf-templates/{report_type}/', response_model=PDFTemplateOut)
def get_pdf_template(report_type: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    tmpl = db.query(PDFTemplate).filter(PDFTemplate.report_type == report_type).first()
    if not tmpl:
        tmpl = PDFTemplate(report_type=report_type)
        db.add(tmpl)
        db.commit()
        db.refresh(tmpl)
    return PDFTemplateOut.model_validate(tmpl)


@router.patch('/pdf-templates/{report_type}/', response_model=PDFTemplateOut)
def update_pdf_template(report_type: str, body: PDFTemplateUpdate, db: Session = Depends(get_db), _: User = Depends(require_manager)):
    tmpl = db.query(PDFTemplate).filter(PDFTemplate.report_type == report_type).first()
    if not tmpl:
        tmpl = PDFTemplate(report_type=report_type)
        db.add(tmpl)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tmpl, field, value)
    db.commit()
    db.refresh(tmpl)
    return PDFTemplateOut.model_validate(tmpl)
