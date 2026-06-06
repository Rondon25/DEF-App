"""Production planning & capacity (PRODUCTION_PLAN sheet).
A run produces finished goods and, on completion, consumes raw materials via the BOM."""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role
from routers.stock import post_fg_movement
from routers.rm_inventory import post_rm_movement

router = APIRouter(tags=["production"])

PROD_ROLES = ("admin", "central_team", "operations")


def _hours_for(db: Session, sku: models.SKU, units: float) -> float:
    rate = sku.target_output_per_shift_hour or 0
    return round(units / rate, 2) if rate else 0.0


def _run_dict(db: Session, r: models.ProductionRun) -> dict:
    return {
        "id": r.id, "plant_id": r.plant_id, "plant_name": r.plant.name if r.plant else None,
        "sku_id": r.sku_id, "sku_code": r.sku.code if r.sku else None, "sku_name": r.sku.name if r.sku else None,
        "unit": r.sku.unit if r.sku else None,
        "run_date": r.run_date.isoformat() if r.run_date else None,
        "planned_units": r.planned_units, "produced_units": r.produced_units,
        "hours_required": r.hours_required, "status": r.status.value, "note": r.note,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }


@router.get("/admin/production")
def list_runs(plant_id: int | None = None, run_date: date | None = None, status: str | None = None,
              db: Session = Depends(get_db), _=Depends(require_role(*PROD_ROLES))):
    q = db.query(models.ProductionRun)
    if plant_id:
        q = q.filter(models.ProductionRun.plant_id == plant_id)
    if run_date:
        q = q.filter(models.ProductionRun.run_date == run_date)
    if status:
        q = q.filter(models.ProductionRun.status == status)
    rows = q.order_by(models.ProductionRun.run_date.desc(), models.ProductionRun.id.desc()).all()
    return [_run_dict(db, r) for r in rows]


@router.get("/admin/production/capacity")
def capacity(run_date: date | None = None, db: Session = Depends(get_db), _=Depends(require_role(*PROD_ROLES))):
    """Per-plant capacity utilisation for a given day (planned runs)."""
    d = run_date or date.today()
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).all()
    out = []
    for p in plants:
        runs = db.query(models.ProductionRun).filter(
            models.ProductionRun.plant_id == p.id, models.ProductionRun.run_date == d,
            models.ProductionRun.status != models.ProductionStatus.cancelled,
        ).all()
        used = round(sum(r.hours_required for r in runs), 2)
        cap = p.effective_hours_per_day
        util = round((used / cap) * 100, 1) if cap else 0
        out.append({
            "plant_id": p.id, "plant_name": p.name, "capacity_hours": cap, "used_hours": used,
            "utilization": util, "over_capacity": used > cap, "run_count": len(runs),
            "planned_units": sum(r.planned_units for r in runs),
        })
    return {"date": d.isoformat(), "plants": out}


class ProductionIn(BaseModel):
    plant_id: int
    sku_id: int
    planned_units: float
    run_date: date | None = None
    note: str | None = None


@router.post("/admin/production", status_code=201)
def create_run(payload: ProductionIn, db: Session = Depends(get_db), user=Depends(require_role(*PROD_ROLES))):
    sku = db.query(models.SKU).filter(models.SKU.id == payload.sku_id).first()
    if not sku:
        raise HTTPException(404, "Product not found")
    if not db.query(models.Plant).filter(models.Plant.id == payload.plant_id).first():
        raise HTTPException(404, "Plant not found")
    run = models.ProductionRun(
        plant_id=payload.plant_id, sku_id=payload.sku_id, run_date=payload.run_date or date.today(),
        planned_units=payload.planned_units, hours_required=_hours_for(db, sku, payload.planned_units),
        status=models.ProductionStatus.planned, note=payload.note, created_by=getattr(user, "id", None),
    )
    db.add(run); db.commit(); db.refresh(run)
    return _run_dict(db, run)


@router.get("/admin/production/{run_id}/requirements")
def run_requirements(run_id: int, db: Session = Depends(get_db), _=Depends(require_role(*PROD_ROLES))):
    """RM needed for a run vs available at its plant (the BOM explosion)."""
    run = db.query(models.ProductionRun).filter(models.ProductionRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    bom = db.query(models.BillOfMaterials).filter(models.BillOfMaterials.sku_id == run.sku_id).all()
    units = run.produced_units if run.status == models.ProductionStatus.completed else run.planned_units
    out = []
    for b in bom:
        needed = round(b.qty_per_unit * units, 2)
        st = db.query(models.RawMaterialStock).filter(
            models.RawMaterialStock.plant_id == run.plant_id,
            models.RawMaterialStock.material_id == b.material_id,
        ).first()
        available = st.quantity if st else 0
        out.append({
            "material_id": b.material_id, "material_name": b.material.name if b.material else None,
            "unit": b.material.unit if b.material else None,
            "qty_per_unit": b.qty_per_unit, "needed": needed, "available": round(available, 2),
            "shortfall": round(max(0, needed - available), 2), "sufficient": available >= needed,
        })
    return out


class CompleteIn(BaseModel):
    produced_units: float | None = None   # defaults to planned


@router.post("/admin/production/{run_id}/complete")
def complete_run(run_id: int, payload: CompleteIn, db: Session = Depends(get_db), user=Depends(require_role(*PROD_ROLES))):
    run = db.query(models.ProductionRun).filter(models.ProductionRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status == models.ProductionStatus.completed:
        raise HTTPException(400, "Run already completed")
    units = payload.produced_units if payload.produced_units is not None else run.planned_units
    sku = run.sku

    # Consume raw materials via BOM (allowed to go short; report shortfalls)
    warnings = []
    bom = db.query(models.BillOfMaterials).filter(models.BillOfMaterials.sku_id == run.sku_id).all()
    for b in bom:
        needed = b.qty_per_unit * units
        st = db.query(models.RawMaterialStock).filter(
            models.RawMaterialStock.plant_id == run.plant_id,
            models.RawMaterialStock.material_id == b.material_id,
        ).first()
        available = st.quantity if st else 0
        if available < needed:
            warnings.append(f"{b.material.name}: short {round(needed - available, 2)} {b.material.unit}")
        post_rm_movement(db, run.plant_id, b.material_id, qty_out=needed, reason="production",
                         note=f"Run #{run.id} — {sku.code}", staff_id=getattr(user, "id", None),
                         movement_date=run.run_date)

    # Produce finished goods
    post_fg_movement(db, run.plant_id, run.sku_id, qty_in=units, reason="production",
                     note=f"Run #{run.id}", staff_id=getattr(user, "id", None), movement_date=run.run_date)

    run.produced_units = units
    run.hours_required = _hours_for(db, sku, units)
    run.status = models.ProductionStatus.completed
    run.completed_at = datetime.utcnow()
    db.commit(); db.refresh(run)
    return {"run": _run_dict(db, run), "warnings": warnings}


@router.post("/admin/production/{run_id}/cancel")
def cancel_run(run_id: int, db: Session = Depends(get_db), _=Depends(require_role(*PROD_ROLES))):
    run = db.query(models.ProductionRun).filter(models.ProductionRun.id == run_id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    if run.status == models.ProductionStatus.completed:
        raise HTTPException(400, "Cannot cancel a completed run")
    run.status = models.ProductionStatus.cancelled
    db.commit()
    return {"message": "Run cancelled"}
