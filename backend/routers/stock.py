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


def post_fg_movement(db: Session, plant_id: int, sku_id: int, *, qty_in: float = 0.0,
                     qty_out: float = 0.0, reason: str = "adjustment", note: str | None = None,
                     staff_id: int | None = None, movement_date=None):
    """Post a finished-goods StockMovement and update the plant stock + SKU total.
    Shared by manual production/dispatch endpoints and the order-dispatch hook."""
    from datetime import date as _date
    ps = db.query(models.PlantStock).filter(
        models.PlantStock.sku_id == sku_id, models.PlantStock.plant_id == plant_id,
    ).first()
    if not ps:
        ps = models.PlantStock(sku_id=sku_id, plant_id=plant_id, quantity=0)
        db.add(ps); db.flush()
    opening = ps.quantity or 0
    closing = opening + qty_in - qty_out
    db.add(models.StockMovement(
        entity=models.StockEntity.finished_good, plant_id=plant_id, sku_id=sku_id,
        movement_date=movement_date or _date.today(), opening=opening, qty_in=qty_in,
        qty_out=qty_out, closing=closing, reason=reason, note=note, staff_id=staff_id,
    ))
    ps.quantity = closing
    db.flush()
    _recompute_sku_total(db, sku_id)
    return ps


def pick_plant_for_sku(db: Session, sku_id: int) -> int | None:
    """Plant holding the most of a SKU (used to auto-source order dispatch)."""
    row = db.query(models.PlantStock).filter(models.PlantStock.sku_id == sku_id).order_by(
        models.PlantStock.quantity.desc()
    ).first()
    return row.plant_id if row else None


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


# ── Finished-goods daily ledger + economics (FG_INVENTORY sheet) ──────────────

from datetime import date, timedelta


class FgMovementIn(BaseModel):
    plant_id: int
    sku_id: int
    quantity: float
    reason: str | None = None
    note: str | None = None
    movement_date: date | None = None


@router.post("/admin/fg/production")
def record_production(payload: FgMovementIn, db: Session = Depends(get_db), user: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    """Record finished-goods produced at a plant (FG in)."""
    if not db.query(models.SKU).filter(models.SKU.id == payload.sku_id).first():
        raise HTTPException(404, "Product not found")
    if not db.query(models.Plant).filter(models.Plant.id == payload.plant_id).first():
        raise HTTPException(404, "Plant not found")
    post_fg_movement(db, payload.plant_id, payload.sku_id, qty_in=payload.quantity,
                     reason=payload.reason or "production", note=payload.note,
                     staff_id=user.id, movement_date=payload.movement_date)
    db.commit()
    return {"message": "Production recorded"}


@router.post("/admin/fg/dispatch")
def record_dispatch(payload: FgMovementIn, db: Session = Depends(get_db), user: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    """Record finished-goods dispatched/shipped from a plant (FG out)."""
    if not db.query(models.SKU).filter(models.SKU.id == payload.sku_id).first():
        raise HTTPException(404, "Product not found")
    post_fg_movement(db, payload.plant_id, payload.sku_id, qty_out=payload.quantity,
                     reason=payload.reason or "dispatch", note=payload.note,
                     staff_id=user.id, movement_date=payload.movement_date)
    db.commit()
    return {"message": "Dispatch recorded"}


@router.get("/admin/fg/ledger")
def fg_ledger(plant_id: int | None = None, sku_id: int | None = None, limit: int = 80,
              db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    q = db.query(models.StockMovement).filter(models.StockMovement.entity == models.StockEntity.finished_good)
    if plant_id:
        q = q.filter(models.StockMovement.plant_id == plant_id)
    if sku_id:
        q = q.filter(models.StockMovement.sku_id == sku_id)
    rows = q.order_by(models.StockMovement.movement_date.desc(), models.StockMovement.id.desc()).limit(limit).all()
    plant_names = {p.id: p.name for p in db.query(models.Plant).all()}
    sku_names = {s.id: (s.code, s.name) for s in db.query(models.SKU).all()}
    out = []
    for m in rows:
        code, name = sku_names.get(m.sku_id, ("?", "?"))
        out.append({
            "id": m.id, "date": m.movement_date.isoformat(), "plant_name": plant_names.get(m.plant_id, "?"),
            "sku_code": code, "sku_name": name, "opening": m.opening, "qty_in": m.qty_in,
            "qty_out": m.qty_out, "closing": m.closing, "reason": m.reason, "note": m.note,
        })
    return out


@router.get("/admin/fg/summary")
def fg_summary(days: int = 30, db: Session = Depends(get_db), _: models.StaffUser = Depends(require_role(*STOCK_ROLES))):
    """Economics + status over the last N days (produced, dispatched, revenue, cost)."""
    since = date.today() - timedelta(days=days)
    skus = {s.id: s for s in db.query(models.SKU).filter(models.SKU.is_archived == False).all()}

    movements = db.query(models.StockMovement).filter(
        models.StockMovement.entity == models.StockEntity.finished_good,
        models.StockMovement.movement_date >= since,
    ).all()
    produced = dispatched = revenue = dispatch_cost = 0.0
    for m in movements:
        s = skus.get(m.sku_id)
        produced += m.qty_in
        dispatched += m.qty_out
        if s:
            revenue += m.qty_out * (s.revenue_per_unit or 0)
            dispatch_cost += m.qty_out * (s.dispatch_cost_per_unit or 0)

    # FG status vs each SKU's min safety stock (current totals)
    below_safety = 0
    status_rows = []
    for s in skus.values():
        qty = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(
            models.PlantStock.sku_id == s.id
        ).scalar() or 0
        min_ss = s.min_fg_safety_stock or 0
        status = "critical" if qty <= min_ss else "warning" if qty <= min_ss * 1.2 else "ok"
        if status != "ok":
            below_safety += 1
        status_rows.append({"sku_code": s.code, "name": s.name, "qty": round(qty, 2),
                            "min_safety": min_ss, "status": status})
    status_rows.sort(key=lambda r: ({"critical": 0, "warning": 1, "ok": 2}[r["status"]], r["name"]))

    return {
        "days": days,
        "produced": round(produced, 2), "dispatched": round(dispatched, 2),
        "revenue": round(revenue, 2), "dispatch_cost": round(dispatch_cost, 2),
        "gross_margin": round(revenue - dispatch_cost, 2),
        "below_safety": below_safety, "status_rows": status_rows,
    }
