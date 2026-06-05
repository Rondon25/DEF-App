"""
Customer authentication — phone number + WhatsApp/SMS OTP.
No password. Every login sends a fresh OTP.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
import models
from services.auth import (
    generate_otp, otp_expiry, is_otp_valid, create_access_token, decode_token
)
from services.whatsapp import send_otp, send_registration_pending

router  = APIRouter(tags=["customer-auth"])
limiter = Limiter(key_func=get_remote_address)

customer_bearer = OAuth2PasswordBearer(tokenUrl="/auth/verify-otp", auto_error=False)


# ── Dependency ────────────────────────────────────────────────────────────────

def get_current_customer(
    token: str = Depends(customer_bearer),
    db: Session = Depends(get_db),
) -> models.Customer:
    exc = HTTPException(status_code=401, detail="Authentication required")
    if not token:
        raise exc
    payload = decode_token(token)
    if not payload or payload.get("type") != "customer":
        raise exc
    customer = db.query(models.Customer).filter(
        models.Customer.id == int(payload["sub"])
    ).first()
    if not customer:
        raise exc
    return customer


def require_active_customer(
    customer: models.Customer = Depends(get_current_customer),
) -> models.Customer:
    if customer.status == models.CustomerStatus.pending:
        raise HTTPException(status_code=403, detail="Your account is awaiting approval. We'll notify you via WhatsApp.")
    if customer.status != models.CustomerStatus.active:
        raise HTTPException(status_code=403, detail="Account is not active. Please contact support.")
    return customer


# ── Schemas ───────────────────────────────────────────────────────────────────

class DeliveryLocationOut(BaseModel):
    id: int
    label: str
    address: str | None
    city: str | None
    state: str | None
    is_primary: bool

    class Config:
        from_attributes = True


class DeliveryLocationIn(BaseModel):
    label: str = "Delivery Location"
    address: str | None = None
    city: str | None = None
    state: str | None = None


class RegisterRequest(BaseModel):
    phone_number: str
    name: str
    company_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    otp_channel: str = "whatsapp"
    additional_locations: list[DeliveryLocationIn] = []


class SendOTPRequest(BaseModel):
    phone_number: str
    otp_channel: str = "whatsapp"


class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str


class CustomerOut(BaseModel):
    id: int
    name: str
    phone_number: str
    company_name: str | None
    address: str | None
    city: str | None
    state: str | None
    is_credit_account: bool
    status: str
    created_at: datetime
    delivery_locations: list[DeliveryLocationOut] = []

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerOut


# ── Register (new customer) ───────────────────────────────────────────────────

@router.post("/auth/register", status_code=201)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    phone = "".join(c for c in payload.phone_number if c.isdigit())
    if not phone:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    existing = db.query(models.Customer).filter(models.Customer.phone_number == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    customer = models.Customer(
        phone_number=phone,
        name=payload.name,
        company_name=payload.company_name,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        otp_channel=models.OTPChannel.whatsapp,
        status=models.CustomerStatus.pending,
    )
    db.add(customer)
    db.flush()

    for loc in payload.additional_locations:
        db.add(models.CustomerDeliveryLocation(
            customer_id=customer.id,
            label=loc.label or "Delivery Location",
            address=loc.address,
            city=loc.city,
            state=loc.state,
        ))

    db.commit()
    db.refresh(customer)

    # Send welcome + pending message
    send_registration_pending(phone, payload.name)

    return {"message": "Registration submitted. Your account is pending approval. We'll notify you via WhatsApp."}


# ── Send OTP (login or re-send) ───────────────────────────────────────────────

@router.post("/auth/send-otp")
@limiter.limit("3/minute")
def send_otp_route(request: Request, payload: SendOTPRequest, db: Session = Depends(get_db)):
    phone = "".join(c for c in payload.phone_number if c.isdigit())
    customer = db.query(models.Customer).filter(models.Customer.phone_number == phone).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Phone number not registered")
    if customer.status == models.CustomerStatus.rejected:
        raise HTTPException(status_code=403, detail="Account registration was rejected")
    if customer.status == models.CustomerStatus.suspended:
        raise HTTPException(status_code=403, detail="Account is suspended")

    otp = generate_otp(6)
    customer.otp_code       = otp
    customer.otp_expires_at = otp_expiry(10)
    customer.otp_channel    = models.OTPChannel.whatsapp
    db.commit()

    sent = send_otp(phone, otp, customer.name)

    if not sent:
        raise HTTPException(status_code=503, detail="Could not send OTP. Please check your WhatsApp is active and try again.")

    return {"message": "OTP sent via WhatsApp. Valid for 10 minutes."}


# ── Verify OTP ────────────────────────────────────────────────────────────────

@router.post("/auth/verify-otp", response_model=TokenResponse)
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    phone = "".join(c for c in payload.phone_number if c.isdigit())
    customer = db.query(models.Customer).filter(models.Customer.phone_number == phone).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Phone number not found")
    if customer.status == models.CustomerStatus.pending:
        raise HTTPException(status_code=403, detail="Account pending approval. We'll WhatsApp you once approved.")
    if customer.status not in [models.CustomerStatus.active]:
        raise HTTPException(status_code=403, detail="Account is not active")

    if not is_otp_valid(payload.otp_code, customer.otp_code, customer.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    customer.otp_code       = None
    customer.otp_expires_at = None
    db.commit()

    token = create_access_token({
        "sub":   str(customer.id),
        "phone": customer.phone_number,
        "type":  "customer",
    })

    return TokenResponse(
        access_token=token,
        customer=CustomerOut.model_validate(customer),
    )


# ── Get current customer ──────────────────────────────────────────────────────

@router.get("/auth/me", response_model=CustomerOut)
def get_me(current: models.Customer = Depends(require_active_customer)):
    return current


# ── Update profile ────────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    name: str | None = None
    company_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None


@router.patch("/auth/me", response_model=CustomerOut)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current: models.Customer = Depends(require_active_customer),
):
    if payload.name:           current.name          = payload.name
    if payload.company_name:   current.company_name  = payload.company_name
    if payload.address:        current.address       = payload.address
    if payload.city:           current.city          = payload.city
    if payload.state:        current.state       = payload.state
    db.commit()
    db.refresh(current)
    return current


# ── Delivery locations ────────────────────────────────────────────────────────

@router.get("/auth/me/locations", response_model=list[DeliveryLocationOut])
def list_my_locations(
    current: models.Customer = Depends(require_active_customer),
    db: Session = Depends(get_db),
):
    return db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.customer_id == current.id
    ).order_by(models.CustomerDeliveryLocation.created_at.asc()).all()


@router.post("/auth/me/locations", response_model=DeliveryLocationOut, status_code=201)
def add_my_location(
    payload: DeliveryLocationIn,
    current: models.Customer = Depends(require_active_customer),
    db: Session = Depends(get_db),
):
    loc = models.CustomerDeliveryLocation(
        customer_id=current.id,
        label=payload.label or "Delivery Location",
        address=payload.address,
        city=payload.city,
        state=payload.state,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.patch("/auth/me/locations/{loc_id}", response_model=DeliveryLocationOut)
def update_my_location(
    loc_id: int,
    payload: DeliveryLocationIn,
    current: models.Customer = Depends(require_active_customer),
    db: Session = Depends(get_db),
):
    loc = db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.id == loc_id,
        models.CustomerDeliveryLocation.customer_id == current.id,
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if payload.label:          loc.label   = payload.label
    if payload.address is not None: loc.address = payload.address
    if payload.city is not None:    loc.city    = payload.city
    if payload.state is not None: loc.state = payload.state
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/auth/me/locations/{loc_id}", status_code=204)
def delete_my_location(
    loc_id: int,
    current: models.Customer = Depends(require_active_customer),
    db: Session = Depends(get_db),
):
    loc = db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.id == loc_id,
        models.CustomerDeliveryLocation.customer_id == current.id,
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()


# ── Refresh token ─────────────────────────────────────────────────────────────

@router.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(
    current: models.Customer = Depends(require_active_customer),
    db: Session = Depends(get_db),
):
    """Exchange a valid token for a fresh one. Called when token is near expiry."""
    token = create_access_token({
        "sub":   str(current.id),
        "phone": current.phone_number,
        "type":  "customer",
    })
    return TokenResponse(access_token=token, customer=CustomerOut.model_validate(current))


# ── Request phone number change ───────────────────────────────────────────────

class PhoneChangeRequest(BaseModel):
    new_phone: str


@router.post("/auth/request-phone-change")
@limiter.limit("3/hour")
def request_phone_change(
    request: Request,
    payload: PhoneChangeRequest,
    db: Session = Depends(get_db),
    current: models.Customer = Depends(require_active_customer),
):
    """Customer requests a phone number change — sends OTP to new number for verification."""
    new_phone = "".join(c for c in payload.new_phone if c.isdigit())
    if not new_phone or len(new_phone) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    existing = db.query(models.Customer).filter(models.Customer.phone_number == new_phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered to another account")

    otp = generate_otp(6)
    # Store new phone + OTP temporarily in the pending fields
    current.otp_code       = otp
    current.otp_expires_at = otp_expiry(10)
    db.commit()

    # Send OTP to NEW number
    from services.whatsapp import send_otp as send_wa_otp
    send_wa_otp(new_phone, otp, current.name)

    return {"message": f"OTP sent to {new_phone[-4:].rjust(len(new_phone), '*')}. Enter it to confirm the change."}


class PhoneChangeVerify(BaseModel):
    new_phone: str
    otp_code: str


@router.post("/auth/confirm-phone-change", response_model=CustomerOut)
def confirm_phone_change(
    payload: PhoneChangeVerify,
    db: Session = Depends(get_db),
    current: models.Customer = Depends(require_active_customer),
):
    new_phone = "".join(c for c in payload.new_phone if c.isdigit())

    if not is_otp_valid(payload.otp_code, current.otp_code, current.otp_expires_at):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    existing = db.query(models.Customer).filter(models.Customer.phone_number == new_phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already taken")

    current.phone_number  = new_phone
    current.otp_code      = None
    current.otp_expires_at = None
    db.commit()
    db.refresh(current)
    return current
