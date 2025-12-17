from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import csv
import io

from database import get_db
from models import Product, Transaction, TransactionItem, ActivityLog, User
from auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/export", tags=["export"])


# ============ CSV EXPORT ============

@router.get("/products/csv")
def export_products_csv(db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    """Export all products to CSV"""
    products = db.query(Product).filter(Product.is_active == True).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Barcode", "Nama", "Harga Jual", "Harga Modal", "Stok", 
        "Min Stok", "Kategori", "Status Stok"
    ])
    
    # Data
    for p in products:
        writer.writerow([
            p.id, p.barcode or "", p.name, p.price, p.cost_price,
            p.stock, p.min_stock, p.category,
            "RENDAH" if p.stock <= p.min_stock else "OK"
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=produk_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/transactions/csv")
def export_transactions_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Export transactions to CSV"""
    query = db.query(Transaction)
    
    if start_date:
        query = query.filter(Transaction.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.created_at <= datetime.fromisoformat(end_date))
    
    transactions = query.order_by(Transaction.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Tanggal", "Kasir", "Pelanggan", "Subtotal", "Diskon", 
        "Total", "Modal", "Laba", "Metode Bayar", "Hutang"
    ])
    
    # Data
    for t in transactions:
        writer.writerow([
            t.id,
            t.created_at.strftime("%Y-%m-%d %H:%M"),
            t.user.full_name if t.user else "-",
            t.customer.name if t.customer else "-",
            t.subtotal,
            t.discount_amount,
            t.total,
            t.cost_total,
            t.total - t.cost_total,
            t.payment_method,
            "Ya" if t.is_debt else "Tidak"
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=transaksi_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/inventory/csv")
def export_inventory_csv(db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    """Export inventory/low stock report to CSV"""
    products = db.query(Product).filter(Product.is_active == True).order_by(Product.stock).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Nama", "Barcode", "Stok", "Min Stok", "Status", "Harga Jual", "Nilai Stok"])
    
    for p in products:
        status = "⚠️ RENDAH" if p.stock <= p.min_stock else "OK"
        writer.writerow([
            p.name, p.barcode or "", p.stock, p.min_stock, status,
            p.price, p.stock * p.price
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inventaris_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# ============ PROFIT REPORT ============

@router.get("/profit")
def get_profit_report(
    period: str = "daily",  # daily, weekly, monthly
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get profit/loss report"""
    now = datetime.utcnow()
    
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start = now - timedelta(days=7)
    elif period == "monthly":
        start = now - timedelta(days=30)
    else:
        start = now - timedelta(days=1)
    
    transactions = db.query(Transaction).filter(
        Transaction.created_at >= start
    ).all()
    
    total_revenue = sum(t.total for t in transactions)
    total_cost = sum(t.cost_total for t in transactions)
    total_profit = total_revenue - total_cost
    total_discount = sum(t.discount_amount for t in transactions)
    
    # By payment method
    by_method = {}
    for t in transactions:
        method = t.payment_method
        if method not in by_method:
            by_method[method] = {"count": 0, "total": 0, "profit": 0}
        by_method[method]["count"] += 1
        by_method[method]["total"] += t.total
        by_method[method]["profit"] += t.total - t.cost_total
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": now.isoformat(),
        "transaction_count": len(transactions),
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "profit_margin": round(total_profit / total_revenue * 100, 1) if total_revenue > 0 else 0,
        "total_discount": total_discount,
        "by_payment_method": by_method
    }


# ============ LOW STOCK ALERT ============

@router.get("/low-stock")
def get_low_stock_products(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Get products with low stock"""
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.stock <= Product.min_stock
    ).order_by(Product.stock).all()
    
    return [p.to_dict() for p in products]


# ============ ACTIVITY LOG ============

@router.get("/activity-log")
def get_activity_log(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """Get activity log (admin only)"""
    query = db.query(ActivityLog)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if action:
        query = query.filter(ActivityLog.action == action)
    
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [log.to_dict() for log in logs]


def log_activity(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    details: str = None,
    ip_address: str = None
):
    """Helper function to log activity"""
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
