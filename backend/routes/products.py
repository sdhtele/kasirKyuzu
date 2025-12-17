from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import io
import os
import uuid
import shutil
from pathlib import Path
import barcode
from barcode.writer import ImageWriter

from database import get_db
from models import Product, ProductBarcode
from auth import get_current_user, get_current_admin, get_optional_user, User

router = APIRouter(prefix="/api/products", tags=["products"])

# Create uploads directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "products"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ProductCreate(BaseModel):
    barcode: Optional[str] = None
    name: str
    price: int
    cost_price: int = 0
    stock: int = 0
    min_stock: int = 5
    category: Optional[str] = "Makanan"
    emoji: Optional[str] = "🍽️"


class ProductUpdate(BaseModel):
    barcode: Optional[str] = None
    name: Optional[str] = None
    price: Optional[int] = None
    cost_price: Optional[int] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    category: Optional[str] = None
    emoji: Optional[str] = None
    is_active: Optional[bool] = None


class StockAdjust(BaseModel):
    quantity: int  # positive to add, negative to subtract
    reason: Optional[str] = None


@router.get("")
def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all products with optional filters"""
    query = db.query(Product).filter(Product.is_active == True)
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) | 
            (Product.barcode.ilike(f"%{search}%"))
        )
    
    if category:
        query = query.filter(Product.category == category)
    
    if low_stock:
        query = query.filter(Product.stock <= 5)
    
    products = query.order_by(Product.name).all()
    return [p.to_dict() for p in products]


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Get all unique categories"""
    categories = db.query(Product.category).distinct().all()
    return [c[0] for c in categories if c[0]]


@router.get("/low-stock")
def get_low_stock_products(db: Session = Depends(get_db)):
    """Get products with low stock (stock <= min_stock)"""
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.stock <= Product.min_stock
    ).all()
    return [p.to_dict() for p in products]


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get single product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return product.to_dict()


@router.get("/barcode/{code}")
def get_product_by_barcode(code: str, db: Session = Depends(get_db)):
    """Get product by barcode - checks both main barcode and alternative barcodes"""
    # First, check main product barcode
    product = db.query(Product).filter(
        Product.barcode == code,
        Product.is_active == True
    ).first()
    
    # If not found, check alternative barcodes
    if not product:
        alt_barcode = db.query(ProductBarcode).filter(
            ProductBarcode.barcode == code
        ).first()
        if alt_barcode:
            product = db.query(Product).filter(
                Product.id == alt_barcode.product_id,
                Product.is_active == True
            ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return product.to_dict()


@router.post("")
def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create new product (admin only)"""
    # Check barcode uniqueness if provided
    if product.barcode:
        existing = db.query(Product).filter(Product.barcode == product.barcode).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="Barcode sudah digunakan"
            )
    
    db_product = Product(
        barcode=product.barcode,
        name=product.name,
        price=product.price,
        cost_price=product.cost_price,
        stock=product.stock,
        min_stock=product.min_stock,
        category=product.category,
        emoji=product.emoji
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product.to_dict()


@router.put("/{product_id}")
def update_product(
    product_id: int, 
    product: ProductUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update existing product (admin only)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Check barcode uniqueness if changing
    if product.barcode and product.barcode != db_product.barcode:
        existing = db.query(Product).filter(Product.barcode == product.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode sudah digunakan")
    
    update_data = product.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product.to_dict()


@router.put("/{product_id}/stock")
def adjust_stock(
    product_id: int,
    adjustment: StockAdjust,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Adjust product stock (admin only)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    new_stock = db_product.stock + adjustment.quantity
    if new_stock < 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Stok tidak cukup. Stok saat ini: {db_product.stock}"
        )
    
    db_product.stock = new_stock
    db.commit()
    db.refresh(db_product)
    
    return {
        "product": db_product.to_dict(),
        "adjustment": adjustment.quantity,
        "reason": adjustment.reason
    }


@router.delete("/{product_id}")
def delete_product(
    product_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Soft delete product (admin only)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    db_product.is_active = False
    db.commit()
    return {"message": "Produk berhasil dihapus"}


@router.get("/{product_id}/barcode-image")
def get_product_barcode_image(product_id: int, db: Session = Depends(get_db)):
    """Generate barcode image for product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Use barcode or generate from product ID
    barcode_value = product.barcode or f"P{product_id:012d}"
    
    # Generate EAN13 barcode
    try:
        ean = barcode.get('ean13', barcode_value, writer=ImageWriter())
        buffer = io.BytesIO()
        ean.write(buffer)
        buffer.seek(0)
        return Response(content=buffer.getvalue(), media_type="image/png")
    except Exception:
        # Fallback to Code128 for non-EAN barcodes
        code128 = barcode.get('code128', barcode_value, writer=ImageWriter())
        buffer = io.BytesIO()
        code128.write(buffer)
        buffer.seek(0)
        return Response(content=buffer.getvalue(), media_type="image/png")


@router.get("/{product_id}/barcode-svg")
def get_product_barcode_svg(product_id: int, db: Session = Depends(get_db)):
    """Generate barcode SVG for product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    barcode_value = product.barcode or f"P{product_id:012d}"
    
    try:
        code128 = barcode.get('code128', barcode_value)
        buffer = io.BytesIO()
        code128.write(buffer)
        buffer.seek(0)
        return Response(content=buffer.getvalue(), media_type="image/svg+xml")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{product_id}/upload-image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Upload product image (admin only)"""
    # Validate product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF"
        )
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 5MB")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{product_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Delete old image if exists
    if product.image_url:
        old_path = UPLOAD_DIR / product.image_url.split('/')[-1]
        if old_path.exists():
            old_path.unlink()
    
    # Save new image
    with open(filepath, "wb") as f:
        f.write(file_content)
    
    # Update product
    product.image_url = f"/uploads/products/{filename}"
    db.commit()
    db.refresh(product)
    
    return {
        "message": "Gambar berhasil diupload",
        "image_url": product.image_url,
        "product": product.to_dict()
    }


@router.delete("/{product_id}/image")
def delete_product_image(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete product image (admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    if product.image_url:
        # Delete file
        filepath = UPLOAD_DIR / product.image_url.split('/')[-1]
        if filepath.exists():
            filepath.unlink()
        
        # Update product
        product.image_url = None
        db.commit()
    
    return {"message": "Gambar berhasil dihapus"}


# ============ MULTI-BARCODE ENDPOINTS ============

class BarcodeAliasCreate(BaseModel):
    barcode: str
    description: Optional[str] = None


@router.get("/{product_id}/barcodes")
def get_product_barcodes(product_id: int, db: Session = Depends(get_db)):
    """Get all barcodes for a product (main + alternatives)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    barcodes = []
    
    # Main barcode
    if product.barcode:
        barcodes.append({
            "id": None,  # Main barcode doesn't have separate ID
            "barcode": product.barcode,
            "is_primary": True,
            "description": "Barcode utama"
        })
    
    # Alternative barcodes
    alt_barcodes = db.query(ProductBarcode).filter(
        ProductBarcode.product_id == product_id
    ).all()
    
    for ab in alt_barcodes:
        barcodes.append({
            "id": ab.id,
            "barcode": ab.barcode,
            "is_primary": False,
            "description": ab.description or "Barcode alternatif"
        })
    
    return barcodes


@router.post("/{product_id}/barcodes")
def add_barcode_alias(
    product_id: int,
    data: BarcodeAliasCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Add alternative barcode to a product (admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Check if barcode already exists in main products
    existing_main = db.query(Product).filter(Product.barcode == data.barcode).first()
    if existing_main:
        raise HTTPException(
            status_code=400, 
            detail=f"Barcode sudah digunakan oleh produk: {existing_main.name}"
        )
    
    # Check if barcode already exists in alternative barcodes
    existing_alt = db.query(ProductBarcode).filter(ProductBarcode.barcode == data.barcode).first()
    if existing_alt:
        existing_product = db.query(Product).filter(Product.id == existing_alt.product_id).first()
        raise HTTPException(
            status_code=400, 
            detail=f"Barcode sudah digunakan oleh produk: {existing_product.name if existing_product else 'Unknown'}"
        )
    
    # Add new barcode alias
    new_alias = ProductBarcode(
        barcode=data.barcode,
        product_id=product_id,
        description=data.description
    )
    db.add(new_alias)
    db.commit()
    db.refresh(new_alias)
    
    return {
        "message": "Barcode alternatif berhasil ditambahkan",
        "barcode": new_alias.to_dict()
    }


@router.delete("/{product_id}/barcodes/{barcode_id}")
def delete_barcode_alias(
    product_id: int,
    barcode_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete alternative barcode (admin only)"""
    alias = db.query(ProductBarcode).filter(
        ProductBarcode.id == barcode_id,
        ProductBarcode.product_id == product_id
    ).first()
    
    if not alias:
        raise HTTPException(status_code=404, detail="Barcode tidak ditemukan")
    
    db.delete(alias)
    db.commit()
    
    return {"message": "Barcode alternatif berhasil dihapus"}

