"""Delivery dispatch, tracking, and GRN."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.auth import require_active_customer
from routers.staff_auth import get_current_staff, require_role
from services.whatsapp import send_order_shipped, send_order_delivered, send_grn_confirmation
from services.files import save_grn_image

router = APIRouter(tags=["delivery"])


# ── Ops: dispatch order ───────────────────────────────────────────────────────

class DispatchIn(BaseModel):
    tracking_number: str | None = None
    carrier: str | None = None
    notes: str | None = None
    plant_id: int | None = None   # fulfilling plant; auto-picked per item if omitted


@router.post("/staff/orders/{order_id}/dispatch")
def dispatch_order(
    order_id: int,
    payload: DispatchIn,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team", "operations")),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in [models.OrderStatus.confirmed, models.OrderStatus.in_production, models.OrderStatus.ready_for_dispatch]:
        raise HTTPException(status_code=400, detail="Order must be confirmed before dispatch")

    delivery = models.Delivery(
        order_id=order.id,
        tracking_number=payload.tracking_number,
        carrier=payload.carrier,
        shipped_at=datetime.utcnow(),
        shipped_by=staff.id,
        notes=payload.notes,
    )
    db.add(delivery)
    order.status = models.OrderStatus.shipped

    # Post finished-goods dispatch movements (decrement plant stock) for each line.
    # Stock bookkeeping must NEVER block the order status transition, so it's
    # isolated — any failure is logged and ignored.
    try:
        from routers.stock import post_fg_movement, pick_plant_for_sku
        for item in order.items:
            plant_id = payload.plant_id or pick_plant_for_sku(db, item.sku_id)
            if plant_id:
                post_fg_movement(
                    db, plant_id, item.sku_id, qty_out=item.quantity,
                    reason="dispatch", note=f"Order {order.order_number}", staff_id=staff.id,
                )
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        order.status = models.OrderStatus.shipped
        db.add(models.Delivery(
            order_id=order.id, tracking_number=payload.tracking_number,
            carrier=payload.carrier, shipped_at=datetime.utcnow(),
            shipped_by=staff.id, notes=payload.notes,
        ))
        print(f"[dispatch] FG stock posting skipped for {order.order_number}: {exc}")
    db.commit()

    customer = order.customer
    send_order_shipped(
        customer.phone_number, customer.name, order.order_number,
        payload.tracking_number or "", payload.carrier or "",
    )
    return {"message": "Order dispatched and customer notified"}


# ── Ops: mark delivered ───────────────────────────────────────────────────────

@router.post("/staff/orders/{order_id}/deliver")
def mark_delivered(
    order_id: int,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team", "operations")),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != models.OrderStatus.shipped:
        raise HTTPException(status_code=400, detail="Order must be shipped before marking delivered")

    if order.delivery:
        order.delivery.delivered_at = datetime.utcnow()
        order.delivery.delivered_by = staff.id

    order.status = models.OrderStatus.grn_pending
    db.commit()

    customer = order.customer
    send_order_delivered(customer.phone_number, customer.name, order.order_number)
    return {"message": "Order marked delivered, GRN notification sent to customer"}


# ── Customer: submit GRN (with optional delivery photo) ──────────────────────

@router.post("/orders/{order_id}/grn")
async def submit_grn(
    order_id: int,
    condition_notes: str = Form(None),
    is_accepted: bool    = Form(True),
    received_qty: float  = Form(None),
    image: UploadFile    = File(None),
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != models.OrderStatus.grn_pending:
        raise HTTPException(status_code=400, detail="GRN can only be submitted after delivery")
    if order.grn:
        raise HTTPException(status_code=400, detail="GRN already submitted")

    image_url, image_filename = None, None
    if image and image.filename:
        image_url, image_filename = await save_grn_image(image, order.order_number)

    grn = models.GRN(
        order_id=order.id,
        received_qty=received_qty,
        condition_notes=condition_notes,
        is_accepted=is_accepted,
        image_url=image_url,
        image_filename=image_filename,
        submitted_at=datetime.utcnow(),
    )
    db.add(grn)
    order.status = models.OrderStatus.grn_submitted
    db.commit()

    send_grn_confirmation(customer.phone_number, customer.name, order.order_number)
    return {"message": "GRN submitted successfully"}


# ── Staff: close order (final reconciliation) ─────────────────────────────────

@router.post("/staff/orders/{order_id}/close")
def close_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "finance", "central_team")),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != models.OrderStatus.grn_submitted:
        raise HTTPException(status_code=400, detail="Order must have GRN submitted before closing")

    order.status = models.OrderStatus.closed
    db.commit()
    return {"message": "Order closed"}


# ── Customer: get delivery details for their order ───────────────────────────

@router.get("/orders/{order_id}/delivery")
def get_delivery_customer(
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

    d = order.delivery
    g = order.grn
    return {
        "delivery": {
            "tracking_number": d.tracking_number if d else None,
            "carrier":         d.carrier if d else None,
            "shipped_at":      d.shipped_at.isoformat() if d and d.shipped_at else None,
            "delivered_at":    d.delivered_at.isoformat() if d and d.delivered_at else None,
        } if d else None,
        "grn": {
            "condition_notes": g.condition_notes if g else None,
            "image_url":       g.image_url if g else None,
            "is_accepted":     g.is_accepted if g else None,
            "submitted_at":    g.submitted_at.isoformat() if g and g.submitted_at else None,
        } if g else None,
    }


# ── Staff: get delivery details ───────────────────────────────────────────────

@router.get("/staff/orders/{order_id}/delivery")
def get_delivery(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    d = order.delivery
    g = order.grn

    return {
        "delivery": {
            "tracking_number": d.tracking_number if d else None,
            "carrier":         d.carrier if d else None,
            "shipped_at":      d.shipped_at.isoformat() if d and d.shipped_at else None,
            "delivered_at":    d.delivered_at.isoformat() if d and d.delivered_at else None,
        } if d else None,
        "grn": {
            "received_qty":    g.received_qty if g else None,
            "condition_notes": g.condition_notes if g else None,
            "image_url":       g.image_url if g else None,
            "is_accepted":     g.is_accepted if g else None,
            "submitted_at":    g.submitted_at.isoformat() if g and g.submitted_at else None,
        } if g else None,
    }
