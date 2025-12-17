from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Transaction, TransactionItem, Product, Discount
from auth import get_current_user, get_optional_user, User

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class CartItemInput(BaseModel):
    product_id: int
    quantity: int


class TransactionCreate(BaseModel):
    items: List[CartItemInput]
    discount_code: Optional[str] = None
    payment_method: str = "cash"
    paid: int
    notes: Optional[str] = None


@router.get("")
def get_transactions(
    limit: int = 50,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    payment_method: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all transactions with optional filters"""
    query = db.query(Transaction).order_by(Transaction.created_at.desc())
    
    if date_from:
        try:
            from_date = datetime.fromisoformat(date_from)
            query = query.filter(Transaction.created_at >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.fromisoformat(date_to)
            query = query.filter(Transaction.created_at <= to_date)
        except ValueError:
            pass
    
    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method)
    
    transactions = query.limit(limit).all()
    return [t.to_dict() for t in transactions]


@router.get("/{transaction_id}")
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Get single transaction by ID"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return transaction.to_dict()


@router.post("")
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Create new transaction"""
    if not data.items:
        raise HTTPException(status_code=400, detail="Keranjang kosong")
    
    # Validate payment method
    valid_methods = ["cash", "qris", "debit", "credit"]
    if data.payment_method not in valid_methods:
        raise HTTPException(
            status_code=400, 
            detail=f"Metode pembayaran harus salah satu dari: {', '.join(valid_methods)}"
        )
    
    # Calculate subtotal and validate products
    subtotal = 0
    items_data = []
    
    for item in data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=400, 
                detail=f"Produk dengan ID {item.product_id} tidak ditemukan"
            )
        
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Stok {product.name} tidak cukup. Tersedia: {product.stock}"
            )
        
        item_subtotal = product.price * item.quantity
        subtotal += item_subtotal
        
        items_data.append({
            "product": product,
            "quantity": item.quantity,
            "price": product.price
        })
    
    # Apply discount if provided
    discount = None
    discount_amount = 0
    
    if data.discount_code:
        discount = db.query(Discount).filter(
            Discount.code == data.discount_code.upper(),
            Discount.is_active == True
        ).first()
        
        if not discount:
            raise HTTPException(status_code=400, detail="Kode promo tidak valid")
        
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
        
        discount_amount = discount.calculate_discount(subtotal)
    
    total = subtotal - discount_amount
    
    # Validate payment
    if data.paid < total:
        raise HTTPException(
            status_code=400, 
            detail=f"Pembayaran kurang Rp {total - data.paid:,}"
        )
    
    change = data.paid - total
    
    # Create transaction
    transaction = Transaction(
        user_id=current_user.id if current_user else None,
        discount_id=discount.id if discount else None,
        subtotal=subtotal,
        discount_amount=discount_amount,
        total=total,
        paid=data.paid,
        change=change,
        payment_method=data.payment_method,
        notes=data.notes
    )
    db.add(transaction)
    db.flush()  # Get transaction ID
    
    # Create transaction items and update stock
    for item_data in items_data:
        product = item_data["product"]
        
        # Create item
        trans_item = TransactionItem(
            transaction_id=transaction.id,
            product_id=product.id,
            product_name=product.name,
            quantity=item_data["quantity"],
            price_at_sale=item_data["price"]
        )
        db.add(trans_item)
        
        # Reduce stock
        product.stock -= item_data["quantity"]
    
    # Update discount usage
    if discount:
        discount.usage_count += 1
    
    db.commit()
    db.refresh(transaction)
    
    return transaction.to_dict()


@router.delete("/{transaction_id}")
def void_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Void/cancel a transaction (restore stock)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Hanya admin yang bisa membatalkan transaksi"
        )
    
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    # Restore stock
    for item in transaction.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity
    
    # Restore discount usage
    if transaction.discount:
        transaction.discount.usage_count -= 1
    
    # Delete transaction
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transaksi berhasil dibatalkan"}
