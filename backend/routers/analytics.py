"""Sales analytics — revenue, top customers, SKU breakdown."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["analytics"])


@router.get("/admin/analytics/summary")
def get_summary(
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    since = datetime.utcnow() - timedelta(days=days)

    orders = db.query(models.Order).filter(
        models.Order.created_at >= since,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()

    closed = [o for o in orders if o.status == models.OrderStatus.closed]
    active = [o for o in orders if o.status not in [models.OrderStatus.closed, models.OrderStatus.cancelled]]

    total_revenue = sum(o.total_amount for o in closed)
    pending_revenue = sum(o.total_amount for o in active)

    # Orders by status
    status_counts: dict = {}
    for o in orders:
        s = o.status.value if hasattr(o.status, "value") else o.status
        status_counts[s] = status_counts.get(s, 0) + 1

    return {
        "period_days":      days,
        "total_orders":     len(orders),
        "closed_orders":    len(closed),
        "active_orders":    len(active),
        "total_revenue":    round(total_revenue, 2),
        "pending_revenue":  round(pending_revenue, 2),
        "status_breakdown": status_counts,
    }


@router.get("/admin/analytics/top-customers")
def get_top_customers(
    days: int = Query(90, le=365),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    since = datetime.utcnow() - timedelta(days=days)

    results = (
        db.query(
            models.Customer.id,
            models.Customer.name,
            models.Customer.company_name,
            func.count(models.Order.id).label("order_count"),
            func.sum(models.Order.total_amount).label("total_spent"),
        )
        .join(models.Order, models.Order.customer_id == models.Customer.id)
        .filter(
            models.Order.created_at >= since,
            models.Order.status != models.OrderStatus.cancelled,
        )
        .group_by(models.Customer.id, models.Customer.name, models.Customer.company_name)
        .order_by(func.sum(models.Order.total_amount).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "customer_id":   r.id,
            "name":          r.name,
            "company_name":  r.company_name,
            "order_count":   r.order_count,
            "total_spent":   round(float(r.total_spent or 0), 2),
        }
        for r in results
    ]


@router.get("/admin/analytics/top-skus")
def get_top_skus(
    days: int = Query(90, le=365),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    since = datetime.utcnow() - timedelta(days=days)

    results = (
        db.query(
            models.SKU.id,
            models.SKU.code,
            models.SKU.name,
            models.SKU.unit,
            func.sum(models.OrderItem.quantity).label("total_qty"),
            func.sum(models.OrderItem.subtotal).label("total_revenue"),
        )
        .join(models.OrderItem, models.OrderItem.sku_id == models.SKU.id)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(
            models.Order.created_at >= since,
            models.Order.status != models.OrderStatus.cancelled,
        )
        .group_by(models.SKU.id, models.SKU.code, models.SKU.name, models.SKU.unit)
        .order_by(func.sum(models.OrderItem.subtotal).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "sku_id":        r.id,
            "sku_code":      r.code,
            "name":          r.name,
            "unit":          r.unit,
            "total_qty":     round(float(r.total_qty or 0), 2),
            "total_revenue": round(float(r.total_revenue or 0), 2),
        }
        for r in results
    ]


@router.get("/admin/analytics/revenue-over-time")
def get_revenue_over_time(
    days: int = Query(30, le=365),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "sales")),
):
    """Returns daily order counts and revenue for the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    orders = db.query(models.Order).filter(
        models.Order.created_at >= since,
        models.Order.status != models.OrderStatus.cancelled,
    ).all()

    # Bucket by date
    daily: dict = {}
    for o in orders:
        day = o.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"date": day, "orders": 0, "revenue": 0.0}
        daily[day]["orders"] += 1
        daily[day]["revenue"] += o.total_amount

    # Fill in missing days with zero
    result = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        entry = daily.get(day, {"date": day, "orders": 0, "revenue": 0.0})
        entry["revenue"] = round(entry["revenue"], 2)
        result.append(entry)

    return result
