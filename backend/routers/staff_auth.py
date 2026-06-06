"""Staff authentication — email + password."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
import models
from services.auth import hash_password, verify_password, create_access_token, decode_token, is_locked, record_fail, clear_fails

router = APIRouter(tags=["staff-auth"])
staff_bearer = OAuth2PasswordBearer(tokenUrl="/staff/login", auto_error=False)


# ── Dependency ────────────────────────────────────────────────────────────────

def get_current_staff(
    token: str = Depends(staff_bearer),
    db: Session = Depends(get_db),
) -> models.StaffUser:
    exc = HTTPException(status_code=401, detail="Staff authentication required")
    if not token:
        raise exc
    payload = decode_token(token)
    if not payload or payload.get("type") != "staff":
        raise exc
    user = db.query(models.StaffUser).filter(
        models.StaffUser.id == int(payload["sub"])
    ).first()
    if not user or not user.is_active:
        raise exc
    return user


def require_role(*roles: str):
    def checker(current: models.StaffUser = Depends(get_current_staff)):
        if current.role.value not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {', '.join(roles)}")
        return current
    return checker


# ── Schemas ───────────────────────────────────────────────────────────────────

class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str


class StaffOut(BaseModel):
    id: int
    name: str
    email: str
    phone_number: str | None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StaffTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: StaffOut


class StaffRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_number: str | None = None
    role: str = "sales"


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/staff/login", response_model=StaffTokenResponse)
def staff_login(payload: StaffLoginRequest, db: Session = Depends(get_db)):
    lock_key = f"staff:{payload.email.lower()}"
    if is_locked(lock_key):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in ~15 minutes.")

    user = db.query(models.StaffUser).filter(models.StaffUser.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        record_fail(lock_key)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    clear_fails(lock_key)

    token = create_access_token({
        "sub":   str(user.id),
        "email": user.email,
        "role":  user.role.value,
        "type":  "staff",
    })
    return StaffTokenResponse(access_token=token, user=StaffOut.model_validate(user))


# ── Register (admin only in production — open for setup) ─────────────────────

@router.post("/staff/register", status_code=201, response_model=StaffOut)
def staff_register(payload: StaffRegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.StaffUser).filter(models.StaffUser.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        role = models.StaffRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    user = models.StaffUser(
        name=payload.name,
        email=payload.email,
        phone_number=payload.phone_number,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Get me ────────────────────────────────────────────────────────────────────

@router.get("/staff/me", response_model=StaffOut)
def get_staff_me(current: models.StaffUser = Depends(get_current_staff)):
    return current
