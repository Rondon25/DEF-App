"""Central team: customer approval queue and management."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import get_current_staff, require_role
from services.whatsapp import send_registration_approved, send_registration_rejected
from services.audit import log as audit_log

router = APIRouter(tags=["customers"])


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


class CustomerListOut(BaseModel):
    id: int
    name: str
    phone_number: str
    company_name: str | None
    city: str | None
    state: str | None
    is_credit_account: bool
    credit_limit: float
    status: str
    created_at: datetime
    assigned_salesperson_id: int | None

    class Config:
        from_attributes = True


class ApproveRequest(BaseModel):
    assigned_salesperson_id: int | None = None


class RejectRequest(BaseModel):
    reason: str | None = None


class UpdateCustomerRequest(BaseModel):
    is_credit_account: bool | None = None
    credit_limit: float | None = None
    assigned_salesperson_id: int | None = None
    status: str | None = None


# ── Approval queue ────────────────────────────────────────────────────────────

@router.get("/customers/pending", response_model=list[CustomerListOut])
def get_pending_customers(
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    return db.query(models.Customer).filter(
        models.Customer.status == models.CustomerStatus.pending,
        models.Customer.is_archived == False,
    ).order_by(models.Customer.created_at.asc()).all()


@router.get("/customers", response_model=list[CustomerListOut])
def list_customers(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    q = db.query(models.Customer).filter(models.Customer.is_archived == False)
    if status:
        q = q.filter(models.Customer.status == status)
    return q.order_by(models.Customer.created_at.desc()).all()


@router.post("/customers/{customer_id}/archive")
def archive_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    c.is_archived = True
    audit_log(db, "customer", c.id, "archived", staff=staff)
    db.commit()
    return {"message": "Customer archived"}


@router.get("/customers/{customer_id}", response_model=CustomerListOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.post("/customers/{customer_id}/approve", response_model=CustomerListOut)
def approve_customer(
    customer_id: int,
    payload: ApproveRequest,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    if c.status != models.CustomerStatus.pending:
        raise HTTPException(status_code=400, detail="Customer is not in pending status")

    c.status      = models.CustomerStatus.active
    c.approved_by = staff.id
    c.approved_at = datetime.utcnow()
    if payload.assigned_salesperson_id:
        c.assigned_salesperson_id = payload.assigned_salesperson_id

    audit_log(db, "customer", c.id, "approved", staff=staff, new_value="active")
    db.commit()
    db.refresh(c)
    send_registration_approved(c.phone_number, c.name)
    return c


@router.post("/customers/{customer_id}/reject")
def reject_customer(
    customer_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    c.status = models.CustomerStatus.rejected
    db.commit()
    send_registration_rejected(c.phone_number, c.name, payload.reason or "")
    return {"message": "Customer rejected"}


@router.get("/customers/{customer_id}/orders")
def get_customer_orders(
    customer_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    import models as m
    orders = db.query(m.Order).filter(
        m.Order.customer_id == customer_id
    ).order_by(m.Order.created_at.desc()).all()
    from routers.orders import _enrich_order_staff
    return [_enrich_order_staff(o) for o in orders]


@router.patch("/customers/{customer_id}", response_model=CustomerListOut)
def update_customer(
    customer_id: int,
    payload: UpdateCustomerRequest,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    if payload.is_credit_account is not None:
        c.is_credit_account = payload.is_credit_account
    if payload.credit_limit is not None:
        c.credit_limit = payload.credit_limit
    if payload.assigned_salesperson_id is not None:
        c.assigned_salesperson_id = payload.assigned_salesperson_id
    if payload.status is not None:
        try:
            c.status = models.CustomerStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    db.commit()
    db.refresh(c)
    return c


# ── Delivery locations (staff) ────────────────────────────────────────────────

@router.get("/customers/{customer_id}/locations", response_model=list[DeliveryLocationOut])
def get_customer_locations(
    customer_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    return db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.customer_id == customer_id
    ).order_by(models.CustomerDeliveryLocation.created_at.asc()).all()


@router.post("/customers/{customer_id}/locations", response_model=DeliveryLocationOut, status_code=201)
def add_customer_location(
    customer_id: int,
    payload: DeliveryLocationIn,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    if not db.query(models.Customer).filter(models.Customer.id == customer_id).first():
        raise HTTPException(status_code=404, detail="Customer not found")
    loc = models.CustomerDeliveryLocation(
        customer_id=customer_id,
        label=payload.label or "Delivery Location",
        address=payload.address,
        city=payload.city,
        state=payload.state,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.patch("/customers/{customer_id}/locations/{loc_id}", response_model=DeliveryLocationOut)
def update_customer_location(
    customer_id: int,
    loc_id: int,
    payload: DeliveryLocationIn,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    loc = db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.id == loc_id,
        models.CustomerDeliveryLocation.customer_id == customer_id,
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if payload.label:               loc.label   = payload.label
    if payload.address is not None: loc.address = payload.address
    if payload.city is not None:    loc.city    = payload.city
    if payload.state is not None: loc.state = payload.state
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/customers/{customer_id}/locations/{loc_id}", status_code=204)
def delete_customer_location(
    customer_id: int,
    loc_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    loc = db.query(models.CustomerDeliveryLocation).filter(
        models.CustomerDeliveryLocation.id == loc_id,
        models.CustomerDeliveryLocation.customer_id == customer_id,
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
