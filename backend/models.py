from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), default="kasir")  # admin or kasir
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Product(Base):
    """Product model with barcode and stock"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(50), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)  # Harga jual
    cost_price = Column(Integer, default=0)  # Harga modal untuk laba rugi
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)  # Minimum stok untuk alert
    category = Column(String(50), default="Makanan")
    emoji = Column(String(10), default="🍽️")
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    transaction_items = relationship("TransactionItem", back_populates="product")
    barcodes = relationship("ProductBarcode", back_populates="product", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "barcode": self.barcode,
            "name": self.name,
            "price": self.price,
            "cost_price": self.cost_price,
            "stock": self.stock,
            "min_stock": self.min_stock,
            "is_low_stock": self.stock <= self.min_stock,
            "category": self.category,
            "emoji": self.emoji,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "alt_barcodes": [b.barcode for b in self.barcodes] if self.barcodes else []
        }


class ProductBarcode(Base):
    """Alternative barcodes for a product - allows one product to have multiple barcodes"""
    __tablename__ = "product_barcodes"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    description = Column(String(100), nullable=True)  # e.g., "Kemasan baru", "Dari supplier B"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    product = relationship("Product", back_populates="barcodes")

    def to_dict(self):
        return {
            "id": self.id,
            "barcode": self.barcode,
            "product_id": self.product_id,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Discount(Base):
    """Discount/Promo model"""
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    discount_type = Column(String(20), default="percentage")  # percentage or fixed
    value = Column(Integer, nullable=False)  # percentage value or fixed amount
    min_purchase = Column(Integer, default=0)
    max_discount = Column(Integer, nullable=True)  # max discount for percentage
    is_active = Column(Boolean, default=True)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transactions = relationship("Transaction", back_populates="discount")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "discount_type": self.discount_type,
            "value": self.value,
            "min_purchase": self.min_purchase,
            "max_discount": self.max_discount,
            "is_active": self.is_active,
            "valid_from": self.valid_from.isoformat() if self.valid_from else None,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "usage_limit": self.usage_limit,
            "usage_count": self.usage_count,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def calculate_discount(self, subtotal):
        """Calculate discount amount based on type"""
        if subtotal < self.min_purchase:
            return 0
        
        if self.discount_type == "percentage":
            discount = int(subtotal * self.value / 100)
            if self.max_discount:
                discount = min(discount, self.max_discount)
            return discount
        else:  # fixed
            return min(self.value, subtotal)


class Transaction(Base):
    """Transaction model"""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)  # For member/debt
    discount_id = Column(Integer, ForeignKey("discounts.id"), nullable=True)
    subtotal = Column(Integer, nullable=False)
    discount_amount = Column(Integer, default=0)
    total = Column(Integer, nullable=False)
    cost_total = Column(Integer, default=0)  # Total harga modal untuk laba rugi
    paid = Column(Integer, nullable=False)
    change = Column(Integer, nullable=False)
    payment_method = Column(String(20), default="cash")  # cash, qris, debit, credit, debt
    is_debt = Column(Boolean, default=False)  # True jika hutang
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    discount = relationship("Discount", back_populates="transactions")
    items = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "discount_id": self.discount_id,
            "discount_code": self.discount.code if self.discount else None,
            "subtotal": self.subtotal,
            "discount_amount": self.discount_amount,
            "total": self.total,
            "cost_total": self.cost_total,
            "profit": self.total - self.cost_total,
            "paid": self.paid,
            "change": self.change,
            "payment_method": self.payment_method,
            "is_debt": self.is_debt,
            "notes": self.notes,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class TransactionItem(Base):
    """Transaction item model"""
    __tablename__ = "transaction_items"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(100), nullable=False)  # Store name at time of sale
    quantity = Column(Integer, nullable=False)
    price_at_sale = Column(Integer, nullable=False)  # Store price at time of sale

    # Relationships
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product", back_populates="transaction_items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "price": self.price_at_sale,
            "subtotal": self.quantity * self.price_at_sale
        }


# ============ NEW MODELS ============

class Customer(Base):
    """Customer model for membership and debt tracking"""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True, unique=True, index=True)
    email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    points = Column(Integer, default=0)  # Loyalty points
    member_level = Column(String(20), default="Bronze")  # Bronze, Silver, Gold
    total_spent = Column(Integer, default=0)  # Total pembelian
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    debts = relationship("CustomerDebt", back_populates="customer", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="customer")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "points": self.points,
            "member_level": self.member_level,
            "total_spent": self.total_spent,
            "total_debt": sum(d.amount - d.paid for d in self.debts if not d.is_paid),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class CustomerDebt(Base):
    """Track customer debts/credits"""
    __tablename__ = "customer_debts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    amount = Column(Integer, nullable=False)  # Jumlah hutang
    paid = Column(Integer, default=0)  # Jumlah yang sudah dibayar
    is_paid = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="debts")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "transaction_id": self.transaction_id,
            "amount": self.amount,
            "paid": self.paid,
            "remaining": self.amount - self.paid,
            "is_paid": self.is_paid,
            "notes": self.notes,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None
        }


class ActivityLog(Base):
    """Activity log for audit trail"""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # login, logout, sale, refund, edit_product, etc.
    entity_type = Column(String(50), nullable=True)  # product, transaction, user, etc.
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)  # JSON details
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "System",
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
