"""Payment proof upload and finance verification."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.auth import require_active_customer
from routers.staff_auth import get_current_staff, require_role
from routers.orders import _get_order
from services.files import save_payment_proof
from services.whatsapp import send_payment_received, send_payment_rejected

router = APIRouter(tags=["payments"])


class PaymentOut(BaseModel):
    id: int
    order_id: int
    method: str
    amount: float
    proof_file_url: str | None
    proof_filename: str | None
    status: str
    uploaded_at: datetime
    verified_at: datetime | None
    rejection_reason: str | None

    class Config:
        from_attributes = True


class VerifyPaymentRequest(BaseModel):
    approved: bool
    rejection_reason: str | None = None


# ── Customer: upload payment proof ───────────────────────────────────────────

@router.post("/orders/{order_id}/payment")
async def upload_payment_proof(
    order_id: int,
    method: str = Form("bank_transfer"),
    amount: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != models.OrderStatus.proforma_sent:
        raise HTTPException(status_code=400, detail="Order must have a proforma invoice before uploading payment")

    if order.payment:
        raise HTTPException(status_code=400, detail="Payment proof already uploaded")

    file_url, filename = await save_payment_proof(file, order.order_number)

    try:
        pay_method = models.PaymentMethod(method)
    except ValueError:
        pay_method = models.PaymentMethod.bank_transfer

    payment = models.Payment(
        order_id=order.id,
        method=pay_method,
        amount=amount,
        proof_file_url=file_url,
        proof_filename=filename,
        status=models.PaymentStatus.pending,
    )
    db.add(payment)
    order.status = models.OrderStatus.payment_uploaded
    db.commit()
    db.refresh(payment)

    send_payment_received(customer.phone_number, customer.name, order.order_number)

    return {"message": "Payment proof uploaded successfully", "payment_id": payment.id}


# ── Customer: get my payment ──────────────────────────────────────────────────

@router.get("/orders/{order_id}/payment", response_model=PaymentOut)
def get_my_payment(
    order_id: int,
    db: Session = Depends(get_db),
    customer: models.Customer = Depends(require_active_customer),
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.customer_id == customer.id,
    ).first()
    if not order or not order.payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return order.payment


# ── Staff: get payment for an order ─────────────────────────────────────────

@router.get("/staff/orders/{order_id}/payment")
def get_order_payment_staff(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order or not order.payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    p = order.payment
    return {
        "id":             p.id,
        "order_id":       p.order_id,
        "method":         p.method.value if hasattr(p.method, "value") else p.method,
        "amount":         p.amount,
        "proof_file_url": p.proof_file_url,
        "proof_filename": p.proof_filename,
        "status":         p.status.value if hasattr(p.status, "value") else p.status,
        "uploaded_at":    p.uploaded_at.isoformat(),
        "verified_at":    p.verified_at.isoformat() if p.verified_at else None,
        "rejection_reason": p.rejection_reason,
    }


# ── Finance: verification queue ───────────────────────────────────────────────

@router.get("/finance/payments", response_model=list[dict])
def list_pending_payments(
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "finance", "central_team")),
):
    payments = db.query(models.Payment).filter(
        models.Payment.status == models.PaymentStatus.pending
    ).order_by(models.Payment.uploaded_at.asc()).all()

    return [
        {
            "id":             p.id,
            "order_id":       p.order_id,
            "order_number":   p.order.order_number if p.order else None,
            "customer_name":  p.order.customer.name if p.order and p.order.customer else None,
            "customer_phone": p.order.customer.phone_number if p.order and p.order.customer else None,
            "method":         p.method.value if hasattr(p.method, "value") else p.method,
            "amount":         p.amount,
            "proof_file_url": p.proof_file_url,
            "proof_filename": p.proof_filename,
            "status":         p.status.value if hasattr(p.status, "value") else p.status,
            "uploaded_at":    p.uploaded_at.isoformat(),
        }
        for p in payments
    ]


@router.post("/finance/payments/{payment_id}/verify")
def verify_payment(
    payment_id: int,
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "finance", "central_team")),
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.verified_by = staff.id
    payment.verified_at = datetime.utcnow()

    if payload.approved:
        payment.status       = models.PaymentStatus.verified
        payment.order.status = models.OrderStatus.payment_verified
    else:
        payment.status           = models.PaymentStatus.rejected
        payment.rejection_reason = payload.rejection_reason
        payment.order.status     = models.OrderStatus.proforma_sent  # back to awaiting payment

        # Notify customer via WhatsApp
        customer = payment.order.customer
        if customer:
            send_payment_rejected(
                customer.phone_number,
                customer.name,
                payment.order.order_number,
                payload.rejection_reason or "",
            )

    db.commit()
    return {"message": "Payment verified" if payload.approved else "Payment rejected"}
