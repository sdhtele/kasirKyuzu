from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional

from database import get_db
from models import Transaction, TransactionItem, Product, Discount
from auth import get_current_admin, User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/daily")
def get_daily_report(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get daily sales report"""
    # Parse date or use today
    if date:
        try:
            report_date = datetime.fromisoformat(date).date()
        except ValueError:
            report_date = datetime.utcnow().date()
    else:
        report_date = datetime.utcnow().date()
    
    # Get transactions for the day
    start = datetime.combine(report_date, datetime.min.time())
    end = datetime.combine(report_date, datetime.max.time())
    
    transactions = db.query(Transaction).filter(
        Transaction.created_at >= start,
        Transaction.created_at <= end
    ).all()
    
    # Calculate totals
    total_sales = sum(t.total for t in transactions)
    total_transactions = len(transactions)
    total_items = sum(sum(item.quantity for item in t.items) for t in transactions)
    total_discount = sum(t.discount_amount for t in transactions)
    
    # Payment method breakdown
    payment_breakdown = {}
    for t in transactions:
        method = t.payment_method
        if method not in payment_breakdown:
            payment_breakdown[method] = {"count": 0, "total": 0}
        payment_breakdown[method]["count"] += 1
        payment_breakdown[method]["total"] += t.total
    
    # Hourly breakdown
    hourly_sales = {}
    for t in transactions:
        hour = t.created_at.hour
        if hour not in hourly_sales:
            hourly_sales[hour] = {"count": 0, "total": 0}
        hourly_sales[hour]["count"] += 1
        hourly_sales[hour]["total"] += t.total
    
    return {
        "date": report_date.isoformat(),
        "summary": {
            "total_sales": total_sales,
            "total_transactions": total_transactions,
            "total_items_sold": total_items,
            "total_discount": total_discount,
            "average_transaction": total_sales // total_transactions if total_transactions > 0 else 0
        },
        "payment_methods": payment_breakdown,
        "hourly_sales": hourly_sales,
        "transactions": [t.to_dict() for t in transactions]
    }


@router.get("/monthly")
def get_monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get monthly sales report"""
    now = datetime.utcnow()
    report_year = year or now.year
    report_month = month or now.month
    
    # Get transactions for the month
    transactions = db.query(Transaction).filter(
        extract('year', Transaction.created_at) == report_year,
        extract('month', Transaction.created_at) == report_month
    ).all()
    
    # Calculate totals
    total_sales = sum(t.total for t in transactions)
    total_transactions = len(transactions)
    total_discount = sum(t.discount_amount for t in transactions)
    
    # Daily breakdown
    daily_sales = {}
    for t in transactions:
        day = t.created_at.day
        if day not in daily_sales:
            daily_sales[day] = {"count": 0, "total": 0}
        daily_sales[day]["count"] += 1
        daily_sales[day]["total"] += t.total
    
    # Payment method breakdown
    payment_breakdown = {}
    for t in transactions:
        method = t.payment_method
        if method not in payment_breakdown:
            payment_breakdown[method] = {"count": 0, "total": 0}
        payment_breakdown[method]["count"] += 1
        payment_breakdown[method]["total"] += t.total
    
    return {
        "year": report_year,
        "month": report_month,
        "summary": {
            "total_sales": total_sales,
            "total_transactions": total_transactions,
            "total_discount": total_discount,
            "average_daily": total_sales // 30 if total_sales > 0 else 0,
            "average_transaction": total_sales // total_transactions if total_transactions > 0 else 0
        },
        "payment_methods": payment_breakdown,
        "daily_sales": daily_sales
    }


@router.get("/best-sellers")
def get_best_sellers(
    limit: int = 10,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get best selling products"""
    # Date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query best sellers
    results = db.query(
        TransactionItem.product_id,
        TransactionItem.product_name,
        func.sum(TransactionItem.quantity).label('total_quantity'),
        func.sum(TransactionItem.quantity * TransactionItem.price_at_sale).label('total_revenue')
    ).join(Transaction).filter(
        Transaction.created_at >= start_date
    ).group_by(
        TransactionItem.product_id,
        TransactionItem.product_name
    ).order_by(
        func.sum(TransactionItem.quantity).desc()
    ).limit(limit).all()
    
    best_sellers = []
    for r in results:
        product = db.query(Product).filter(Product.id == r.product_id).first()
        best_sellers.append({
            "product_id": r.product_id,
            "product_name": r.product_name,
            "emoji": product.emoji if product else "🍽️",
            "total_quantity": r.total_quantity,
            "total_revenue": r.total_revenue,
            "current_stock": product.stock if product else 0
        })
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "best_sellers": best_sellers
    }


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get overall dashboard summary"""
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), datetime.min.time())
    month_start = datetime(now.year, now.month, 1)
    
    # Today's stats
    today_transactions = db.query(Transaction).filter(
        Transaction.created_at >= today_start
    ).all()
    today_sales = sum(t.total for t in today_transactions)
    today_count = len(today_transactions)
    
    # This month's stats
    month_transactions = db.query(Transaction).filter(
        Transaction.created_at >= month_start
    ).all()
    month_sales = sum(t.total for t in month_transactions)
    month_count = len(month_transactions)
    
    # Product stats
    total_products = db.query(Product).filter(Product.is_active == True).count()
    low_stock = db.query(Product).filter(
        Product.is_active == True,
        Product.stock <= 5
    ).count()
    
    # Active discounts
    active_discounts = db.query(Discount).filter(Discount.is_active == True).count()
    
    return {
        "today": {
            "sales": today_sales,
            "transactions": today_count
        },
        "this_month": {
            "sales": month_sales,
            "transactions": month_count
        },
        "products": {
            "total": total_products,
            "low_stock": low_stock
        },
        "discounts": {
            "active": active_discounts
        }
    }
