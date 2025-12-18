from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from database import engine, Base, SessionLocal
from models import Product, User, Discount
from auth import get_password_hash
from routes import products, transactions, auth, discounts, reports, customers, export, users, excel_export

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "products").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Seed admin user if no users exist
        if db.query(User).count() == 0:
            admin = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                full_name="Administrator",
                role="admin"
            )
            kasir = User(
                username="kasir",
                password_hash=get_password_hash("kasir123"),
                full_name="Kasir 1",
                role="kasir"
            )
            db.add_all([admin, kasir])
            db.commit()
            print("✅ Default users created (admin/admin123, kasir/kasir123)")
        
        # Seed initial products if empty
        if db.query(Product).count() == 0:
            initial_products = [
                # Makanan - no barcode (served directly)
                Product(name="Nasi Goreng", price=15000, stock=50, category="Makanan", emoji="🍛"),
                Product(name="Mie Ayam", price=12000, stock=45, category="Makanan", emoji="🍜"),
                Product(name="Bakso", price=13000, stock=40, category="Makanan", emoji="🍲"),
                Product(name="Soto Ayam", price=14000, stock=50, category="Makanan", emoji="🍵"),
                Product(name="Ayam Geprek", price=18000, stock=30, category="Makanan", emoji="🍗"),
                Product(name="Nasi Padang", price=25000, stock=30, category="Makanan", emoji="🍛"),
                # Minuman - no barcode (served directly)
                Product(name="Es Teh", price=5000, stock=100, category="Minuman", emoji="🧊"),
                Product(name="Es Jeruk", price=6000, stock=100, category="Minuman", emoji="🍊"),
                Product(name="Kopi", price=7000, stock=100, category="Minuman", emoji="☕"),
                Product(name="Air Mineral", price=4000, stock=200, category="Minuman", emoji="💧"),
                Product(name="Jus Alpukat", price=12000, stock=50, category="Minuman", emoji="🥤"),
                # Snack - has barcode (packaged products)
                Product(barcode="8991234567201", name="Kerupuk", price=3000, stock=100, category="Snack", emoji="🍘"),
                Product(barcode="8991234567202", name="Gorengan", price=5000, stock=50, category="Snack", emoji="🍟"),
            ]
            db.add_all(initial_products)
            db.commit()
            print("✅ Initial products seeded successfully!")
        
        # Seed sample discounts if empty
        if db.query(Discount).count() == 0:
            sample_discounts = [
                Discount(
                    code="WELCOME10",
                    name="Welcome Discount 10%",
                    discount_type="percentage",
                    value=10,
                    min_purchase=50000,
                    max_discount=20000
                ),
                Discount(
                    code="HEMAT5K",
                    name="Potongan Rp 5.000",
                    discount_type="fixed",
                    value=5000,
                    min_purchase=30000
                ),
            ]
            db.add_all(sample_discounts)
            db.commit()
            print("✅ Sample discounts created!")
            
    finally:
        db.close()
    
    yield


# Create FastAPI app
app = FastAPI(
    title="Sistem Kasir API",
    description="API untuk sistem kasir retail lengkap dengan barcode, inventory, dan laporan",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(transactions.router)
app.include_router(discounts.router)
app.include_router(reports.router)
app.include_router(customers.router)
app.include_router(export.router)
app.include_router(excel_export.router)
app.include_router(users.router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Sistem Kasir API v2.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "products": "/api/products",
            "transactions": "/api/transactions",
            "discounts": "/api/discounts",
            "reports": "/api/reports",
            "customers": "/api/customers",
            "export": "/api/export",
            "users": "/api/users"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}
