from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import timedelta

from database import get_db
from models import User
from auth import (
    verify_password, 
    get_password_hash, 
    create_access_token,
    get_current_user,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "kasir"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun tidak aktif"
        )
    
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@router.post("/register")
def register(
    request: RegisterRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Register new user (admin only)"""
    # Check if username exists
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah digunakan"
        )
    
    if request.role not in ["admin", "kasir"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role harus 'admin' atau 'kasir'"
        )
    
    user = User(
        username=request.username,
        password_hash=get_password_hash(request.password),
        full_name=request.full_name,
        role=request.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user.to_dict()


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user.to_dict()


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all users (admin only)"""
    users = db.query(User).all()
    return [u.to_dict() for u in users]


@router.put("/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Toggle user active status (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak bisa menonaktifkan diri sendiri"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    user.is_active = not user.is_active
    db.commit()
    
    return user.to_dict()
