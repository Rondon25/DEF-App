"""Sales forecast — daily expected demand per SKU per plant (SALES_FORECAST sheet).
Feeds average daily usage (for reorder points) and production planning."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["forecast"])

FC_ROLES   = ("admin", "central_team", "operations", "sales")
EDIT_ROLES = ("admin", "central_team", "sales")


@router.get("/admin/forecast")
def get_forecast(plant_id: int, start: date, end: date, db: Session = Depends(get_db), _=Depends(require_role(*FC_ROLES))):
    """Grid of forecast values for a plant over a date range: { sku_id: { 'YYYY-MM-DD': units } }."""
    if (end - start).days > 60:
        raise HTTPException(400, "Range too large (max 60 days)")
    skus = db.query(models.SKU).filter(models.SKU.is_archived == False).order_by(models.SKU.code).all()
    rows = db.query(models.SalesForecast).filter(
        models.SalesForecast.plant_id == plant_id,
        models.SalesForecast.forecast_date >= start,
        models.SalesForecast.forecast_date <= end,
    ).all()
    grid: dict = {}
    for r in rows:
        grid.setdefault(r.sku_id, {})[r.forecast_date.isoformat()] = r.forecast_units
    dates = [(start + timedelta(days=i)).isoformat() for i in range((end - start).days + 1)]
    return {
        "dates": dates,
        "skus": [{"id": s.id, "code": s.code, "name": s.name, "unit": s.unit} for s in skus],
        "values": grid,
    }


class ForecastSet(BaseModel):
    plant_id: int
    sku_id: int
    forecast_date: date
    forecast_units: float


@router.post("/admin/forecast")
def set_forecast(payload: ForecastSet, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    fc = db.query(models.SalesForecast).filter(
        models.SalesForecast.plant_id == payload.plant_id,
        models.SalesForecast.sku_id == payload.sku_id,
        models.SalesForecast.forecast_date == payload.forecast_date,
    ).first()
    if fc:
        fc.forecast_units = payload.forecast_units
    else:
        fc = models.SalesForecast(**payload.model_dump())
        db.add(fc)
    db.commit()
    return {"message": "Forecast saved"}


@router.get("/admin/forecast/summary")
def forecast_summary(month: str | None = None, db: Session = Depends(get_db), _=Depends(require_role(*FC_ROLES))):
    """Monthly totals by SKU across all plants. month = 'YYYY-MM' (defaults to current)."""
    today = date.today()
    if month:
        y, m = map(int, month.split("-"))
    else:
        y, m = today.year, today.month
    start = date(y, m, 1)
    end = date(y + (m == 12), (m % 12) + 1, 1) - timedelta(days=1)
    working_days = sum(1 for i in range((end - start).days + 1) if (start + timedelta(days=i)).weekday() < 6)  # exclude Sun

    skus = {s.id: s for s in db.query(models.SKU).filter(models.SKU.is_archived == False).all()}
    rows = db.query(
        models.SalesForecast.sku_id, func.sum(models.SalesForecast.forecast_units)
    ).filter(
        models.SalesForecast.forecast_date >= start, models.SalesForecast.forecast_date <= end,
    ).group_by(models.SalesForecast.sku_id).all()

    by_sku = []
    total = 0.0
    for sku_id, units in rows:
        s = skus.get(sku_id)
        if not s:
            continue
        total += units or 0
        by_sku.append({
            "sku_id": sku_id, "sku_code": s.code, "name": s.name, "units": round(units or 0, 2),
            "avg_daily": round((units or 0) / working_days, 2) if working_days else 0,
        })
    by_sku.sort(key=lambda x: -x["units"])

    # per plant totals
    plant_rows = db.query(
        models.SalesForecast.plant_id, func.sum(models.SalesForecast.forecast_units)
    ).filter(
        models.SalesForecast.forecast_date >= start, models.SalesForecast.forecast_date <= end,
    ).group_by(models.SalesForecast.plant_id).all()
    plant_names = {p.id: p.name for p in db.query(models.Plant).all()}
    by_plant = [{"plant_id": pid, "name": plant_names.get(pid, "?"), "units": round(u or 0, 2)} for pid, u in plant_rows]
    by_plant.sort(key=lambda x: -x["units"])

    return {
        "month": f"{y:04d}-{m:02d}", "working_days": working_days,
        "total_units": round(total, 2), "by_sku": by_sku, "by_plant": by_plant,
    }


@router.post("/admin/forecast/apply-to-usage")
def apply_to_usage(month: str | None = None, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    """Convert forecast demand into raw-material average daily usage per plant via the BOM,
    updating RawMaterialStock.avg_daily_usage (which drives reorder points)."""
    today = date.today()
    if month:
        y, m = map(int, month.split("-"))
    else:
        y, m = today.year, today.month
    start = date(y, m, 1)
    end = date(y + (m == 12), (m % 12) + 1, 1) - timedelta(days=1)
    working_days = sum(1 for i in range((end - start).days + 1) if (start + timedelta(days=i)).weekday() < 6) or 1

    # forecast units per (plant, sku)
    fc_rows = db.query(
        models.SalesForecast.plant_id, models.SalesForecast.sku_id, func.sum(models.SalesForecast.forecast_units)
    ).filter(
        models.SalesForecast.forecast_date >= start, models.SalesForecast.forecast_date <= end,
    ).group_by(models.SalesForecast.plant_id, models.SalesForecast.sku_id).all()

    # explode through BOM -> material usage per plant
    usage: dict = {}   # (plant_id, material_id) -> monthly qty
    bom_by_sku: dict = {}
    for plant_id, sku_id, units in fc_rows:
        if sku_id not in bom_by_sku:
            bom_by_sku[sku_id] = db.query(models.BillOfMaterials).filter(models.BillOfMaterials.sku_id == sku_id).all()
        for b in bom_by_sku[sku_id]:
            usage[(plant_id, b.material_id)] = usage.get((plant_id, b.material_id), 0) + (units or 0) * b.qty_per_unit

    updated = 0
    for (plant_id, material_id), monthly in usage.items():
        st = db.query(models.RawMaterialStock).filter(
            models.RawMaterialStock.plant_id == plant_id,
            models.RawMaterialStock.material_id == material_id,
        ).first()
        if not st:
            st = models.RawMaterialStock(plant_id=plant_id, material_id=material_id, quantity=0)
            db.add(st)
        st.avg_daily_usage = round(monthly / working_days, 2)
        updated += 1
    db.commit()
    return {"message": f"Updated average daily usage for {updated} material lines", "updated": updated}
