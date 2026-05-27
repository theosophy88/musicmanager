"""Auth endpoints: register, login, me."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user,
)
from app.database import get_db, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    scan_schedule_hours: int

    class Config:
        from_attributes = True


@router.post("/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # First user is always admin
    user_count = db.query(User).count()

    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        is_admin=(user_count == 0),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(400, "Account disabled")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


class UpdateSchedule(BaseModel):
    scan_schedule_hours: int  # 0 = manual, 1/6/12/24/48/168


@router.patch("/me/schedule", response_model=UserOut)
def update_schedule(
    req: UpdateSchedule,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.scan_schedule_hours = req.scan_schedule_hours
    db.commit()
    db.refresh(current_user)
    return current_user
