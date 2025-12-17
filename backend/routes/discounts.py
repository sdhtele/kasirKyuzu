from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Discount
from auth import get_current_admin, User

router = APIRouter(prefix="/api/discounts", tags=["discounts"])


class DiscountCreate(BaseModel):
    code: str
    name: str
    discount_type: str = "percentage"  # percentage or fixed
    value: int
    min_purchase: int = 0
    max_discount: Optional[int] = None
    valid_until: Optional[str] = None
    usage_limit: Optional[int] = None


class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[int] = None
    min_purchase: Optional[int] = None
    max_discount: Optional[int] = None
    is_active: Optional[bool] = None
    valid_until: Optional[str] = None
    usage_limit: Optional[int] = None


@router.get("")
def get_discounts(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all discounts"""
    query = db.query(Discount)
    
    if active_only:
        query = query.filter(Discount.is_active == True)
    
    discounts = query.order_by(Discount.created_at.desc()).all()
    return [d.to_dict() for d in discounts]


@router.get("/{discount_id}")
def get_discount(discount_id: int, db: Session = Depends(get_db)):
    """Get single discount by ID"""
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Diskon tidak ditemukan")
    return discount.to_dict()


@router.get("/validate/{code}")
def validate_discount_code(
    code: str, 
    subtotal: int = 0,
    db: Session = Depends(get_db)
):
    """Validate a promo code and return discount info"""
    discount = db.query(Discount).filter(
        Discount.code == code.upper(),
        Discount.is_active == True
    ).first()
    
    if not discount:
        raise HTTPException(status_code=404, detail="Kode promo tidak valid")
    
    # Check validity
    now = datetime.utcnow()
    if discount.valid_until and discount.valid_until < now:
        raise HTTPException(status_code=400, detail="Kode promo sudah kadaluarsa")
    
    if discount.usage_limit and discount.usage_count >= discount.usage_limit:
        raise HTTPException(status_code=400, detail="Kode promo sudah habis")
    
    if subtotal < discount.min_purchase:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum pembelian Rp {discount.min_purchase:,} untuk promo ini"
        )
    
    discount_amount = discount.calculate_discount(subtotal) if subtotal > 0 else 0
    
    return {
        "discount": discount.to_dict(),
        "discount_amount": discount_amount,
        "final_total": subtotal - discount_amount
    }


@router.post("")
def create_discount(
    data: DiscountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create new discount (admin only)"""
    # Validate type
    if data.discount_type not in ["percentage", "fixed"]:
        raise HTTPException(
            status_code=400, 
            detail="Tipe diskon harus 'percentage' atau 'fixed'"
        )
    
    # Check code uniqueness
    existing = db.query(Discount).filter(Discount.code == data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kode promo sudah ada")
    
    # Parse valid_until
    valid_until = None
    if data.valid_until:
        try:
            valid_until = datetime.fromisoformat(data.valid_until)
        except ValueError:
            raise HTTPException(status_code=400, detail="Format tanggal tidak valid")
    
    discount = Discount(
        code=data.code.upper(),
        name=data.name,
        discount_type=data.discount_type,
        value=data.value,
        min_purchase=data.min_purchase,
        max_discount=data.max_discount,
        valid_until=valid_until,
        usage_limit=data.usage_limit
    )
    
    db.add(discount)
    db.commit()
    db.refresh(discount)
    
    return discount.to_dict()


@router.put("/{discount_id}")
def update_discount(
    discount_id: int,
    data: DiscountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update discount (admin only)"""
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Diskon tidak ditemukan")
    
    # Check code uniqueness if changing
    if data.code and data.code.upper() != discount.code:
        existing = db.query(Discount).filter(Discount.code == data.code.upper()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Kode promo sudah ada")
        discount.code = data.code.upper()
    
    if data.name is not None:
        discount.name = data.name
    if data.discount_type is not None:
        if data.discount_type not in ["percentage", "fixed"]:
            raise HTTPException(status_code=400, detail="Tipe diskon tidak valid")
        discount.discount_type = data.discount_type
    if data.value is not None:
        discount.value = data.value
    if data.min_purchase is not None:
        discount.min_purchase = data.min_purchase
    if data.max_discount is not None:
        discount.max_discount = data.max_discount
    if data.is_active is not None:
        discount.is_active = data.is_active
    if data.valid_until is not None:
        try:
            discount.valid_until = datetime.fromisoformat(data.valid_until)
        except ValueError:
            pass
    if data.usage_limit is not None:
        discount.usage_limit = data.usage_limit
    
    db.commit()
    db.refresh(discount)
    
    return discount.to_dict()


@router.delete("/{discount_id}")
def delete_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete discount (admin only)"""
    discount = db.query(Discount).filter(Discount.id == discount_id).first()
    if not discount:
        raise HTTPException(status_code=404, detail="Diskon tidak ditemukan")
    
    db.delete(discount)
    db.commit()
    
    return {"message": "Diskon berhasil dihapus"}
