"""Global staff search across orders, customers and products."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
import models
from routers.staff_auth import get_current_staff

router = APIRouter(tags=["search"])


@router.get("/staff/search")
def global_search(
    q: str = Query("", min_length=0),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    q = (q or "").strip()
    if len(q) < 2:
        return {"orders": [], "customers": [], "skus": []}
    like = f"%{q}%"

    orders = db.query(models.Order).join(models.Customer, models.Order.customer_id == models.Customer.id).filter(
        models.Order.is_archived == False,
        or_(models.Order.order_number.ilike(like), models.Customer.name.ilike(like)),
    ).order_by(models.Order.created_at.desc()).limit(6).all()

    customers = db.query(models.Customer).filter(
        models.Customer.is_archived == False,
        or_(models.Customer.name.ilike(like), models.Customer.phone_number.ilike(like), models.Customer.company_name.ilike(like)),
    ).order_by(models.Customer.name).limit(6).all()

    skus = db.query(models.SKU).filter(
        models.SKU.is_archived == False,
        or_(models.SKU.code.ilike(like), models.SKU.name.ilike(like)),
    ).order_by(models.SKU.name).limit(6).all()

    return {
        "orders": [{"id": o.id, "order_number": o.order_number, "customer_name": o.customer.name if o.customer else "", "status": o.status.value if hasattr(o.status, "value") else o.status, "total": o.total_amount} for o in orders],
        "customers": [{"id": c.id, "name": c.name, "company": c.company_name, "phone": c.phone_number} for c in customers],
        "skus": [{"id": s.id, "code": s.code, "name": s.name, "price": s.current_price} for s in skus],
    }
