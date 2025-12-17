from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User
from auth import get_current_admin, get_password_hash

router = APIRouter(prefix="/api/users", tags=["users"])


# ============ SCHEMAS ============

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "kasir"  # kasir or admin


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordReset(BaseModel):
    new_password: str


# ============ ENDPOINTS ============

@router.get("")
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Get all users (admin only)"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [u.to_dict() for u in users]


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Get user by ID (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return user.to_dict()


@router.post("")
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Create new user (admin only)"""
    # Check username uniqueness
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    
    # Validate role
    if data.role not in ["kasir", "admin"]:
        raise HTTPException(status_code=400, detail="Role harus 'kasir' atau 'admin'")
    
    user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.put("/{user_id}")
def update_user(
    user_id: int, 
    data: UserUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Update user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    # Don't allow editing own admin status
    if user.id == current_user.id and data.role and data.role != "admin":
        raise HTTPException(status_code=400, detail="Tidak bisa mengubah role sendiri")
    
    if data.username:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username sudah digunakan")
        user.username = data.username
    
    if data.full_name:
        user.full_name = data.full_name
    
    if data.role:
        if data.role not in ["kasir", "admin"]:
            raise HTTPException(status_code=400, detail="Role harus 'kasir' atau 'admin'")
        user.role = data.role
    
    if data.is_active is not None:
        # Don't allow deactivating self
        if user.id == current_user.id and not data.is_active:
            raise HTTPException(status_code=400, detail="Tidak bisa menonaktifkan diri sendiri")
        user.is_active = data.is_active
    
    db.commit()
    db.refresh(user)
    return user.to_dict()


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int, 
    data: PasswordReset, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Reset user password (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if len(data.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password minimal 4 karakter")
    
    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"Password {user.username} berhasil direset"}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Delete user (admin only) - soft delete"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus diri sendiri")
    
    # Soft delete
    user.is_active = False
    db.commit()
    return {"message": f"User {user.username} berhasil dinonaktifkan"}
