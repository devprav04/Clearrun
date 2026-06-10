from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..audit import log_action
from ..deps import get_current_user, get_db
from ..models import User, Vendor
from ..schemas import VendorCreate, VendorOut, VendorUpdate, paginated

router = APIRouter(prefix='/api', tags=['vendors'])

SERVICE_LABELS = {
    'calibration': 'Calibration', 'amc': 'AMC / Maintenance',
    'supply': 'Parts Supply', 'repair': 'Repair & Service',
    'installation': 'Installation', 'multiple': 'Multiple Services',
}


def _enrich(v: Vendor) -> VendorOut:
    out = VendorOut.model_validate(v)
    out.service_type_display = SERVICE_LABELS.get(v.service_type, v.service_type)
    out.instruments_count = len(v.instruments)
    out.active_amc_count = sum(1 for a in v.amc_contracts if a.status == 'active')
    return out


@router.get('/vendors/', response_model=dict)
def list_vendors(
    page: int = 1, page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Vendor).order_by(Vendor.name)
    total = q.count()
    vendors = q.offset((page - 1) * page_size).limit(page_size).all()
    return paginated([_enrich(v) for v in vendors], total)


@router.post('/vendors/', response_model=VendorOut, status_code=201)
def create_vendor(
    request: Request, body: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = Vendor(**body.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    log_action(db, current_user, request, 'create', 'Vendor', v.name, f'Created vendor: {v.name}')
    return _enrich(v)


@router.get('/vendors/{vendor_id}/', response_model=VendorOut)
def get_vendor(vendor_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vendor not found.')
    return _enrich(v)


@router.patch('/vendors/{vendor_id}/', response_model=VendorOut)
def update_vendor(
    vendor_id: int, request: Request, body: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vendor not found.')
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(v, field, value)
    db.commit()
    db.refresh(v)
    log_action(db, current_user, request, 'update', 'Vendor', v.name, f'Updated vendor: {v.name}')
    return _enrich(v)


@router.delete('/vendors/{vendor_id}/', status_code=204)
def delete_vendor(
    vendor_id: int, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vendor not found.')
    log_action(db, current_user, request, 'delete', 'Vendor', v.name, f'Deleted vendor: {v.name}')
    db.delete(v)
    db.commit()
