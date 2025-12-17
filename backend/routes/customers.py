from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Customer, CustomerDebt, Transaction
from auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/customers", tags=["customers"])


# ============ SCHEMAS ============

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    points: Optional[int] = None
    member_level: Optional[str] = None


class DebtPayment(BaseModel):
    amount: int
    notes: Optional[str] = None


# ============ CUSTOMER ENDPOINTS ============

@router.get("")
def get_customers(
    search: Optional[str] = None,
    has_debt: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all customers with optional filters"""
    query = db.query(Customer).filter(Customer.is_active == True)
    
    if search:
        query = query.filter(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%"))
        )
    
    customers = query.order_by(Customer.name).all()
    result = [c.to_dict() for c in customers]
    
    if has_debt is True:
        result = [c for c in result if c["total_debt"] > 0]
    elif has_debt is False:
        result = [c for c in result if c["total_debt"] == 0]
    
    return result


@router.get("/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get customer by ID"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
    return customer.to_dict()


@router.post("")
def create_customer(data: CustomerCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Create new customer"""
    # Check phone uniqueness
    if data.phone:
        existing = db.query(Customer).filter(Customer.phone == data.phone).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nomor telepon sudah terdaftar")
    
    customer = Customer(
        name=data.name,
        phone=data.phone,
        email=data.email,
        address=data.address
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer.to_dict()


@router.put("/{customer_id}")
def update_customer(
    customer_id: int, 
    data: CustomerUpdate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
    
    if data.name is not None:
        customer.name = data.name
    if data.phone is not None:
        existing = db.query(Customer).filter(Customer.phone == data.phone, Customer.id != customer_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nomor telepon sudah terdaftar")
        customer.phone = data.phone
    if data.email is not None:
        customer.email = data.email
    if data.address is not None:
        customer.address = data.address
    if data.points is not None:
        customer.points = data.points
    if data.member_level is not None:
        customer.member_level = data.member_level
    
    db.commit()
    db.refresh(customer)
    return customer.to_dict()


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    """Delete customer (admin only)"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
    
    customer.is_active = False
    db.commit()
    return {"message": "Pelanggan berhasil dihapus"}


# ============ DEBT ENDPOINTS ============

@router.get("/{customer_id}/debts")
def get_customer_debts(customer_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get all debts for a customer"""
    debts = db.query(CustomerDebt).filter(
        CustomerDebt.customer_id == customer_id
    ).order_by(CustomerDebt.created_at.desc()).all()
    return [d.to_dict() for d in debts]


@router.post("/{customer_id}/debts/{debt_id}/pay")
def pay_debt(
    customer_id: int,
    debt_id: int,
    data: DebtPayment,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Pay customer debt"""
    debt = db.query(CustomerDebt).filter(
        CustomerDebt.id == debt_id,
        CustomerDebt.customer_id == customer_id
    ).first()
    
    if not debt:
        raise HTTPException(status_code=404, detail="Hutang tidak ditemukan")
    
    if debt.is_paid:
        raise HTTPException(status_code=400, detail="Hutang sudah lunas")
    
    remaining = debt.amount - debt.paid
    if data.amount > remaining:
        raise HTTPException(status_code=400, detail=f"Pembayaran melebihi sisa hutang (Rp {remaining:,})")
    
    debt.paid += data.amount
    if debt.paid >= debt.amount:
        debt.is_paid = True
        debt.paid_at = datetime.utcnow()
    
    if data.notes:
        debt.notes = (debt.notes or "") + f"\n[Bayar Rp {data.amount:,}] {data.notes}"
    
    db.commit()
    db.refresh(debt)
    return debt.to_dict()


# ============ ALL DEBTS ============

@router.get("/debts/all")
def get_all_debts(
    unpaid_only: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all debts across all customers"""
    query = db.query(CustomerDebt)
    if unpaid_only:
        query = query.filter(CustomerDebt.is_paid == False)
    
    debts = query.order_by(CustomerDebt.created_at.desc()).all()
    return [d.to_dict() for d in debts]


# ============ MEMBERSHIP POINTS ============

@router.post("/{customer_id}/points/add")
def add_points(
    customer_id: int,
    points: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add points to customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
    
    customer.points += points
    
    # Update member level based on total spent
    if customer.total_spent >= 10000000:  # 10 juta
        customer.member_level = "Gold"
    elif customer.total_spent >= 5000000:  # 5 juta
        customer.member_level = "Silver"
    else:
        customer.member_level = "Bronze"
    
    db.commit()
    db.refresh(customer)
    return customer.to_dict()


@router.post("/{customer_id}/points/redeem")
def redeem_points(
    customer_id: int,
    points: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Redeem customer points"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Pelanggan tidak ditemukan")
    
    if points > customer.points:
        raise HTTPException(status_code=400, detail=f"Poin tidak cukup (tersedia: {customer.points})")
    
    customer.points -= points
    db.commit()
    db.refresh(customer)
    
    # 1 point = Rp 100 discount
    discount_value = points * 100
    return {
        "message": f"Berhasil tukar {points} poin",
        "discount_value": discount_value,
        "remaining_points": customer.points
    }
