"""Stock / inventory counts per SKU."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["stock"])


class StockUpdate(BaseModel):
    stock_qty: float | None  # None = unlimited


@router.patch("/admin/skus/{sku_id}/stock")
def update_stock(
    sku_id: int,
    payload: StockUpdate,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "operations")),
):
    sku = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    sku.stock_qty = payload.stock_qty
    db.commit()
    return {"id": sku.id, "stock_qty": sku.stock_qty}


@router.get("/admin/stock")
def list_stock(
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team", "operations")),
):
    skus = db.query(models.SKU).filter(models.SKU.is_active == True).all()
    return [
        {
            "id":        s.id,
            "sku_code":  s.code,
            "name":      s.name,
            "unit":      s.unit,
            "stock_qty": s.stock_qty,
            "status":    "unlimited" if s.stock_qty is None else ("low" if s.stock_qty < 10 else "ok"),
        }
        for s in skus
    ]
