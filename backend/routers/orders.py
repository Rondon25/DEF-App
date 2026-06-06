"""Order lifecycle — placement through confirmation."""
import random, string
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.auth import require_active_customer
from routers.staff_auth import get_current_staff, require_role
from services.whatsapp import (
    send_order_received, send_proforma_invoice, send_order_confirmation
)
from services.audit import log as audit_log

router = APIRouter(tags=["orders"])


def _gen_order_number() -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"DEF-{suffix}"


# ── Schemas ───────────────────────────────────────────────────────────────────

class OrderItemIn(BaseModel):
    sku_id: int
    quantity: float


class OrderIn(BaseModel):
    items: list[OrderItemIn]
    delivery_address: str | None = None
    notes: str | None = None


class OrderItemOut(BaseModel):
    id: int
    sku_id: int
    quantity: float
    unit_price: float
    subtotal: float
    sku_name: str | None = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_id: int
    status: str
    subtotal: float
    total_amount: float
    notes: str | None
    delivery_address: str | None
    tentative_delivery_date: date | None
    created_at: datetime
    items: list[OrderItemOut] = []

    class Config:
        from_attributes = True


class ProformaIn(BaseModel):
    notes: str | None = None


class ConfirmOrderIn(BaseModel):
    tentative_delivery_date: date | None = None


# ── Customer: place order ─────────────────────────────────────────────────────

@router.post("/orders", response_model=OrderOut, status_code=201)
def place_order(
    payload: OrderIn,
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # ── Duplicate guard: block identical order within 5 minutes ──────────────
    from datetime import timedelta
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    recent_orders = db.query(models.Order).filter(
        models.Order.customer_id == customer.id,
        models.Order.created_at >= five_min_ago,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()

    incoming_skus = sorted([(i.sku_id, i.quantity) for i in payload.items])
    for recent in recent_orders:
        existing_skus = sorted([(item.sku_id, item.quantity) for item in recent.items])
        if existing_skus == incoming_skus:
            raise HTTPException(
                status_code=409,
                detail=f"This order looks identical to {recent.order_number} placed just now. Wait 5 minutes or contact us if this is a new order."
            )

    order_items = []
    subtotal = 0.0

    for item_in in payload.items:
        sku = db.query(models.SKU).filter(
            models.SKU.id == item_in.sku_id,
            models.SKU.is_active == True,
        ).first()
        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU {item_in.sku_id} not found or inactive")

        item_subtotal = round(item_in.quantity * sku.current_price, 2)
        subtotal += item_subtotal
        order_items.append(models.OrderItem(
            sku_id=item_in.sku_id,
            quantity=item_in.quantity,
            unit_price=sku.current_price,
            subtotal=item_subtotal,
        ))

    order = models.Order(
        order_number=_gen_order_number(),
        customer_id=customer.id,
        salesperson_id=customer.assigned_salesperson_id,
        status=models.OrderStatus.submitted,
        subtotal=round(subtotal, 2),
        total_amount=round(subtotal, 2),
        delivery_address=payload.delivery_address or customer.address,
        notes=payload.notes,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    audit_log(db, "order", order.id, "created", new_value=order.order_number)
    db.commit()

    send_order_received(customer.phone_number, customer.name, order.order_number)
    return _enrich_order(order)


# ── Customer: cancel own order ───────────────────────────────────────────────

@router.post("/orders/{order_id}/cancel")
def customer_cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != models.OrderStatus.submitted:
        raise HTTPException(
            status_code=400,
            detail="You can only cancel an order before it has been reviewed by our team."
        )
    order.status = models.OrderStatus.cancelled
    audit_log(db, "order", order.id, "cancelled_by_customer", new_value="cancelled")
    db.commit()
    return {"message": "Order cancelled"}


# ── Customer: reorder ────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/reorder", response_model=OrderOut, status_code=201)
def reorder(
    order_id: int,
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    original = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Order not found")
    if not original.items:
        raise HTTPException(status_code=400, detail="Original order has no items")

    order_items = []
    subtotal = 0.0
    for item in original.items:
        sku = db.query(models.SKU).filter(
            models.SKU.id == item.sku_id,
            models.SKU.is_active == True,
        ).first()
        if not sku:
            continue
        item_subtotal = round(item.quantity * sku.current_price, 2)
        subtotal += item_subtotal
        order_items.append(models.OrderItem(
            sku_id=sku.id,
            quantity=item.quantity,
            unit_price=sku.current_price,
            subtotal=item_subtotal,
        ))

    if not order_items:
        raise HTTPException(status_code=400, detail="No active SKUs found in original order")

    new_order = models.Order(
        order_number=_gen_order_number(),
        customer_id=customer.id,
        salesperson_id=customer.assigned_salesperson_id,
        status=models.OrderStatus.submitted,
        subtotal=round(subtotal, 2),
        total_amount=round(subtotal, 2),
        delivery_address=original.delivery_address or customer.address,
        notes=f"Reorder of {original.order_number}",
        items=order_items,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    send_order_received(customer.phone_number, customer.name, new_order.order_number)
    return _enrich_order(new_order)


# ── Customer: list my orders ──────────────────────────────────────────────────

@router.get("/orders", response_model=list[OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    orders = db.query(models.Order).filter(
        models.Order.customer_id == customer.id,
        models.Order.is_archived == False,
    ).order_by(models.Order.created_at.desc()).all()
    return [_enrich_order(o) for o in orders]


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_my_order(
    order_id: int,
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _enrich_order(order)


# ── Staff: list all orders ────────────────────────────────────────────────────

@router.get("/staff/orders", response_model=list[dict])
def list_all_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    q = db.query(models.Order).filter(models.Order.is_archived == False)
    if status:
        q = q.filter(models.Order.status == status)
    orders = q.order_by(models.Order.created_at.desc()).all()
    return [_enrich_order_staff(o) for o in orders]


# ── Staff: create order on behalf of a customer ──────────────────────────────

class StaffOrderIn(BaseModel):
    customer_id: int
    items: list[OrderItemIn]
    delivery_address: str | None = None
    notes: str | None = None


@router.post("/staff/orders", status_code=201)
def staff_create_order(
    payload: StaffOrderIn,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    customer = db.query(models.Customer).filter(models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    order_items, subtotal = [], 0.0
    for item_in in payload.items:
        sku = db.query(models.SKU).filter(models.SKU.id == item_in.sku_id, models.SKU.is_active == True).first()
        if not sku:
            raise HTTPException(status_code=404, detail=f"SKU {item_in.sku_id} not found")
        item_subtotal = round(item_in.quantity * sku.current_price, 2)
        subtotal += item_subtotal
        order_items.append(models.OrderItem(sku_id=sku.id, quantity=item_in.quantity, unit_price=sku.current_price, subtotal=item_subtotal))

    order = models.Order(
        order_number=_gen_order_number(),
        customer_id=customer.id,
        salesperson_id=customer.assigned_salesperson_id or staff.id,
        status=models.OrderStatus.submitted,
        subtotal=round(subtotal, 2),
        total_amount=round(subtotal, 2),
        delivery_address=payload.delivery_address or customer.address,
        notes=payload.notes,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    audit_log(db, "order", order.id, "created_by_staff", staff=staff, new_value=order.order_number)
    db.commit()

    send_order_received(customer.phone_number, customer.name, order.order_number)
    return _enrich_order_staff(order)


# ── Staff: archive (soft delete) order ───────────────────────────────────────

@router.post("/staff/orders/{order_id}/archive")
def archive_order(
    order_id: int,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    order = _get_order(order_id, db)
    order.is_archived = True
    audit_log(db, "order", order.id, "archived", staff=staff)
    db.commit()
    return {"message": "Order archived"}


# ── Staff: get single order ──────────────────────────────────────────────────

@router.get("/staff/orders/{order_id}")
def get_order_staff(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    order = _get_order(order_id, db)
    return _enrich_order_staff(order)


# ── Staff: verify order + issue proforma ─────────────────────────────────────

@router.post("/staff/orders/{order_id}/verify")
def verify_order(
    order_id: int,
    payload: ProformaIn,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    order = _get_order(order_id, db)
    if order.status != models.OrderStatus.submitted:
        raise HTTPException(status_code=400, detail="Order must be in submitted status to verify")

    # Create proforma invoice
    invoice_number = f"PI-{order.order_number}"
    proforma = models.ProformaInvoice(
        order_id=order.id,
        invoice_number=invoice_number,
        total_amount=order.total_amount,
        issued_by=staff.id,
        notes=payload.notes,
    )
    db.add(proforma)

    order.status      = models.OrderStatus.proforma_sent
    order.verified_by = staff.id
    order.verified_at = datetime.utcnow()
    audit_log(db, "order", order.id, "status_change", staff=staff, old_value="submitted", new_value="proforma_sent")
    db.commit()
    db.refresh(order)

    # Send proforma via WhatsApp
    customer = order.customer
    items = [
        {
            "name":       item.sku.name if item.sku else f"SKU #{item.sku_id}",
            "quantity":   item.quantity,
            "unit_price": item.unit_price,
            "subtotal":   item.subtotal,
        }
        for item in order.items
    ]
    sent = send_proforma_invoice(
        customer.phone_number, customer.name,
        order.order_number, items, order.total_amount,
        payload.notes or "",
    )
    if sent:
        proforma.wa_sent = True
        db.commit()

    return {"message": "Order verified and proforma sent", "invoice_number": invoice_number}


# ── Staff: confirm order after payment verified ───────────────────────────────

@router.post("/staff/orders/{order_id}/confirm")
def confirm_order(
    order_id: int,
    payload: ConfirmOrderIn,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    order = _get_order(order_id, db)
    if order.status != models.OrderStatus.payment_verified:
        raise HTTPException(status_code=400, detail="Payment must be verified before confirming")

    order.status       = models.OrderStatus.confirmed
    order.confirmed_by = staff.id
    order.confirmed_at = datetime.utcnow()
    if payload.tentative_delivery_date:
        order.tentative_delivery_date = payload.tentative_delivery_date
    audit_log(db, "order", order.id, "status_change", staff=staff, old_value="payment_verified", new_value="confirmed")
    db.commit()
    db.refresh(order)

    customer = order.customer
    delivery_str = str(order.tentative_delivery_date) if order.tentative_delivery_date else ""
    send_order_confirmation(customer.phone_number, customer.name, order.order_number, delivery_str)

    return {"message": "Order confirmed and customer notified"}


# ── Staff: update order status ────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    status: str


@router.patch("/staff/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    order = _get_order(order_id, db)
    try:
        order.status = models.OrderStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")
    db.commit()
    return {"message": f"Status updated to {payload.status}"}


# ── Staff: cancel order ───────────────────────────────────────────────────────

class CancelOrderIn(BaseModel):
    reason: str | None = None


@router.post("/staff/orders/{order_id}/cancel")
def cancel_order(
    order_id: int,
    payload: CancelOrderIn,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    order = _get_order(order_id, db)
    if order.status in [models.OrderStatus.shipped, models.OrderStatus.delivered,
                        models.OrderStatus.grn_pending, models.OrderStatus.grn_submitted,
                        models.OrderStatus.closed]:
        raise HTTPException(status_code=400, detail="Cannot cancel an order that has already shipped or closed")
    order.status = models.OrderStatus.cancelled
    if payload.reason:
        order.notes = f"[CANCELLED] {payload.reason}" + (f"\n{order.notes}" if order.notes else "")
    db.commit()
    return {"message": "Order cancelled"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_order(order_id: int, db: Session) -> models.Order:
    o = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


def _enrich_order(order: models.Order) -> dict:
    return {
        "id":                      order.id,
        "order_number":            order.order_number,
        "customer_id":             order.customer_id,
        "status":                  order.status.value if hasattr(order.status, "value") else order.status,
        "subtotal":                order.subtotal,
        "total_amount":            order.total_amount,
        "notes":                   order.notes,
        "delivery_address":        order.delivery_address,
        "tentative_delivery_date": str(order.tentative_delivery_date) if order.tentative_delivery_date else None,
        "created_at":              order.created_at.isoformat(),
        "items": [
            {
                "id":         i.id,
                "sku_id":     i.sku_id,
                "sku_name":   i.sku.name if i.sku else None,
                "quantity":   i.quantity,
                "unit_price": i.unit_price,
                "subtotal":   i.subtotal,
            }
            for i in order.items
        ],
    }


def _enrich_order_staff(order: models.Order) -> dict:
    base = _enrich_order(order)
    base["customer_name"]  = order.customer.name if order.customer else None
    base["customer_phone"] = order.customer.phone_number if order.customer else None
    base["company_name"]   = order.customer.company_name if order.customer else None
    return base
