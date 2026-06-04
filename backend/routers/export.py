"""Export orders, payments, customers to CSV."""
import csv, io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["export"])


def _csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/export/orders")
def export_orders(
    days: int = Query(90, le=730),
    status: str | None = None,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "finance")),
):
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(models.Order).filter(models.Order.created_at >= since)
    if status:
        q = q.filter(models.Order.status == status)
    orders = q.order_by(models.Order.created_at.desc()).all()

    headers = ["Order Number", "Customer", "Company", "Status", "Total (USD)",
               "Delivery Address", "Created", "Confirmed"]
    rows = [
        [
            o.order_number,
            o.customer.name if o.customer else "",
            o.customer.company_name if o.customer else "",
            o.status.value if hasattr(o.status, "value") else o.status,
            f"{o.total_amount:.2f}",
            o.delivery_address or "",
            o.created_at.strftime("%Y-%m-%d"),
            o.confirmed_at.strftime("%Y-%m-%d") if o.confirmed_at else "",
        ]
        for o in orders
    ]
    return _csv_response(rows, headers, f"orders_{datetime.utcnow().strftime('%Y%m%d')}.csv")


@router.get("/admin/export/payments")
def export_payments(
    days: int = Query(90, le=730),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "finance", "central_team")),
):
    since = datetime.utcnow() - timedelta(days=days)
    payments = db.query(models.Payment).filter(
        models.Payment.uploaded_at >= since
    ).order_by(models.Payment.uploaded_at.desc()).all()

    headers = ["Order Number", "Customer", "Method", "Amount (USD)", "Status", "Uploaded", "Verified"]
    rows = [
        [
            p.order.order_number if p.order else "",
            p.order.customer.name if p.order and p.order.customer else "",
            p.method.value if hasattr(p.method, "value") else p.method,
            f"{p.amount:.2f}",
            p.status.value if hasattr(p.status, "value") else p.status,
            p.uploaded_at.strftime("%Y-%m-%d"),
            p.verified_at.strftime("%Y-%m-%d") if p.verified_at else "",
        ]
        for p in payments
    ]
    return _csv_response(rows, headers, f"payments_{datetime.utcnow().strftime('%Y%m%d')}.csv")


@router.get("/admin/export/customers")
def export_customers(
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    customers = db.query(models.Customer).order_by(models.Customer.created_at.desc()).all()

    headers = ["Name", "Company", "Phone", "City", "State", "Status",
               "Credit Account", "Total Orders", "Registered"]
    rows = [
        [
            c.name,
            c.company_name or "",
            c.phone_number,
            c.city or "",
            c.state or "",
            c.status.value if hasattr(c.status, "value") else c.status,
            "Yes" if c.is_credit_account else "No",
            len(c.orders),
            c.created_at.strftime("%Y-%m-%d"),
        ]
        for c in customers
    ]
    return _csv_response(rows, headers, f"customers_{datetime.utcnow().strftime('%Y%m%d')}.csv")
