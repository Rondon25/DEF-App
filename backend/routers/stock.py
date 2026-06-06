"""Plants (factories/warehouses) + per-plant stock + stock analytics."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["stock"])

STOCK_ROLES = ("admin", "central_team", "operations")


# ── Plants ────────────────────────────────────────────────────────────────────

class PlantIn(BaseModel):
    name: str
    location: str | None = None
    manager_name: str | None = None
    manager_phone: str | None = None
    manager_email: str | None = None
    max_capacity: float | None = None


def _plant_holding(db: Session, plant_id: int) -> float:
    return db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(
        models.PlantStock.plant_id == plant_id
    ).scalar() or 0


def _plant_to_dict(db: Session, p: models.Plant) -> dict:
    holding = _plant_holding(db, p.id)
    product_count = db.query(models.PlantStock).filter(
        models.PlantStock.plant_id == p.id, models.PlantStock.quantity > 0
    ).count()
    util = round((holding / p.max_capacity) * 100, 1) if p.max_capacity else None
    return {
        "id": p.id, "name": p.name, "location": p.location,
        "manager_name": p.manager_name, "manager_phone": p.manager_phone, "manager_email": p.manager_email,
        "max_capacity": p.max_capacity, "is_active": p.is_active,
        "current_holding": round(holding, 2), "product_count": product_count,
        "utilization": util,
    }


@router.get("/admin/plants")
def list_plants(db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).order_by(models.Plant.name).all()
    return [_plant_to_dict(db, p) for p in plants]


@router.post("/admin/plants", status_code=201)
def create_plant(payload: PlantIn, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role("admin", "central_team"))):
    plant = models.Plant(**payload.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return _plant_to_dict(db, plant)


@router.patch("/admin/plants/{plant_id}")
def update_plant(plant_id: int, payload: PlantIn, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role("admin", "central_team"))):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    for k, v in payload.model_dump().items():
        setattr(plant, k, v)
    db.commit()
    db.refresh(plant)
    return _plant_to_dict(db, plant)


@router.get("/admin/plants/{plant_id}")
def plant_detail(plant_id: int, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id, models.Plant.is_archived == False).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    info = _plant_to_dict(db, plant)
    # Products held at this plant
    rows = db.query(models.PlantStock, models.SKU).join(models.SKU, models.SKU.id == models.PlantStock.sku_id).filter(
        models.PlantStock.plant_id == plant_id, models.SKU.is_archived == False
    ).all()
    products = [{
        "sku_id": sku.id, "sku_code": sku.code, "name": sku.name, "unit": sku.unit,
        "quantity": round(ps.quantity, 2), "status": "low" if ps.quantity < 10 else "ok",
    } for ps, sku in rows]
    products.sort(key=lambda x: x["quantity"], reverse=True)
    low_count = sum(1 for p in products if p["quantity"] < 10)
    info["products"] = products
    info["low_stock"] = low_count
    return info


@router.post("/admin/plants/{plant_id}/archive")
def archive_plant(plant_id: int, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role("admin", "central_team"))):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    plant.is_archived = True
    db.commit()
    return {"message": "Plant archived"}


# ── Per-plant stock ───────────────────────────────────────────────────────────

class StockSet(BaseModel):
    sku_id: int
    plant_id: int
    quantity: float


def _recompute_sku_total(db: Session, sku_id: int):
    total = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(
        models.PlantStock.sku_id == sku_id
    ).scalar()
    sku = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if sku:
        sku.stock_qty = total


@router.post("/admin/stock")
def set_stock(payload: StockSet, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    sku = db.query(models.SKU).filter(models.SKU.id == payload.sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="Product not found")
    plant = db.query(models.Plant).filter(models.Plant.id == payload.plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    ps = db.query(models.PlantStock).filter(
        models.PlantStock.sku_id == payload.sku_id,
        models.PlantStock.plant_id == payload.plant_id,
    ).first()
    if ps:
        ps.quantity = payload.quantity
    else:
        ps = models.PlantStock(sku_id=payload.sku_id, plant_id=payload.plant_id, quantity=payload.quantity)
        db.add(ps)
    db.flush()
    _recompute_sku_total(db, payload.sku_id)
    db.commit()
    return {"message": "Stock updated"}


@router.get("/admin/stock")
def list_stock(plant_id: int | None = None, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    """Per-product stock with per-plant breakdown. Optional ?plant_id filters to one plant."""
    skus = db.query(models.SKU).filter(models.SKU.is_archived == False).order_by(models.SKU.name).all()
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).all()
    plant_map = {p.id: p.name for p in plants}

    result = []
    for s in skus:
        rows = db.query(models.PlantStock).filter(models.PlantStock.sku_id == s.id).all()
        by_plant = {r.plant_id: r.quantity for r in rows}
        if plant_id:
            qty = by_plant.get(plant_id, 0)
        else:
            qty = sum(by_plant.values())
        result.append({
            "id": s.id,
            "sku_code": s.code,
            "name": s.name,
            "unit": s.unit,
            "total_qty": round(qty, 2),
            "by_plant": [{"plant_id": pid, "plant_name": plant_map.get(pid, "?"), "quantity": q} for pid, q in by_plant.items()],
            "status": "low" if qty < 10 else "ok",
        })
    return result


@router.get("/admin/stock/summary")
def stock_summary(db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    """KPIs + chart data."""
    skus = db.query(models.SKU).filter(models.SKU.is_archived == False).all()
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).all()

    total_units = 0.0
    low_count = 0
    per_product = []
    for s in skus:
        qty = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(
            models.PlantStock.sku_id == s.id
        ).scalar() or 0
        total_units += qty
        if qty < 10:
            low_count += 1
        per_product.append({"name": s.name, "sku_code": s.code, "qty": round(qty, 2)})

    # By plant
    by_plant = []
    for p in plants:
        pqty = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(
            models.PlantStock.plant_id == p.id
        ).scalar() or 0
        by_plant.append({"plant_id": p.id, "name": p.name, "qty": round(pqty, 2)})

    per_product.sort(key=lambda x: x["qty"], reverse=True)
    by_plant.sort(key=lambda x: x["qty"], reverse=True)

    return {
        "total_products": len(skus),
        "total_units": round(total_units, 2),
        "low_stock": low_count,
        "plant_count": len(plants),
        "top_products": per_product[:6],
        "by_plant": by_plant,
    }
