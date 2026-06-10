from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import log_action
from ..deps import get_current_user, get_db
from ..models import SparePart, StockTransaction, User
from ..schemas import (
    SparePartCreate, SparePartOut, SparePartUpdate,
    StockTransactionCreate, StockTransactionOut,
    paginated,
)

router = APIRouter(prefix='/api/inventory', tags=['inventory'])


def _enrich_part(p: SparePart) -> SparePartOut:
    out = SparePartOut.model_validate(p)
    out.unit_cost = float(p.unit_cost)
    out.is_low_stock = p.quantity_in_stock <= p.minimum_stock_level
    return out


def _enrich_tx(t: StockTransaction) -> StockTransactionOut:
    out = StockTransactionOut.model_validate(t)
    out.part_name = t.part.name if t.part else None
    pb = t.performed_by
    out.performed_by_name = (f'{pb.first_name} {pb.last_name}'.strip() or pb.username) if pb else None
    return out


@router.get('/parts/low-stock/', response_model=list)
def low_stock(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    parts = db.query(SparePart).filter(SparePart.quantity_in_stock <= SparePart.minimum_stock_level).all()
    return [_enrich_part(p) for p in parts]


@router.get('/parts/', response_model=dict)
def list_parts(page: int = 1, page_size: int = 20, search: str = '', db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(SparePart)
    if search:
        like = f'%{search}%'
        q = q.filter(SparePart.name.ilike(like) | SparePart.part_number.ilike(like))
    total = q.count()
    return paginated([_enrich_part(p) for p in q.offset((page-1)*page_size).limit(page_size).all()], total)


@router.get('/parts/{part_id}/', response_model=SparePartOut)
def get_part(part_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    p = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Spare part not found.')
    return _enrich_part(p)


@router.post('/parts/', response_model=SparePartOut, status_code=201)
def create_part(request: Request, body: SparePartCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = SparePart(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    log_action(db, current_user, request, 'create', 'Spare Part', p.name,
               f'Added part {p.name} (#{p.part_number}) — qty: {p.quantity_in_stock}')
    return _enrich_part(p)


@router.patch('/parts/{part_id}/', response_model=SparePartOut)
def update_part(part_id: int, request: Request, body: SparePartUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Spare part not found.')
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    log_action(db, current_user, request, 'update', 'Spare Part', p.name, f'Updated part {p.name} — qty: {p.quantity_in_stock}')
    return _enrich_part(p)


@router.delete('/parts/{part_id}/', status_code=204)
def delete_part(part_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(SparePart).filter(SparePart.id == part_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Spare part not found.')
    log_action(db, current_user, request, 'delete', 'Spare Part', p.name, f'Deleted part {p.name} (#{p.part_number})')
    db.delete(p)
    db.commit()


@router.get('/transactions/', response_model=dict)
def list_transactions(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(StockTransaction)
    total = q.count()
    return paginated([_enrich_tx(t) for t in q.offset((page-1)*page_size).limit(page_size).all()], total)


@router.post('/transactions/', response_model=StockTransactionOut, status_code=201)
def create_transaction(request: Request, body: StockTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(SparePart).filter(SparePart.id == body.part).first()
    if not p:
        raise HTTPException(status_code=404, detail='Spare part not found.')
    tx = StockTransaction(
        part_id=body.part,
        transaction_type=body.transaction_type,
        quantity=body.quantity,
        performed_by_id=current_user.id,
        reference=body.reference,
        notes=body.notes,
    )
    # Update stock quantity
    if body.transaction_type == 'in':
        p.quantity_in_stock += body.quantity
    elif body.transaction_type == 'out':
        p.quantity_in_stock -= body.quantity
    else:
        p.quantity_in_stock = body.quantity
    db.add(tx)
    db.commit()
    db.refresh(tx)
    action = 'checkout' if body.transaction_type == 'out' else 'create'
    log_action(db, current_user, request, action, 'Inventory', p.name,
               f'{body.transaction_type} {body.quantity}x {p.name} — {body.notes}')
    return _enrich_tx(tx)
