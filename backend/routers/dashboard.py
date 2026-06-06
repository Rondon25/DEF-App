"""Executive manufacturing dashboard — rollup of forecast, procurement, production,
inventory and capacity (the DASHBOARD sheet)."""
import math
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.staff_auth import require_role
from routers.rm_inventory import rm_summary
from routers.forecast import forecast_summary
from routers.production import capacity as production_capacity
from routers.stock import fg_summary

router = APIRouter(tags=["dashboard"])

MFG_ROLES = ("admin", "central_team", "operations")


@router.get("/admin/dashboard/manufacturing")
def manufacturing_dashboard(db: Session = Depends(get_db), _=Depends(require_role(*MFG_ROLES))):
    rm = rm_summary(db=db, _=None)
    fc = forecast_summary(month=None, db=db, _=None)
    fg = fg_summary(days=30, db=db, _=None)
    cap = production_capacity(run_date=None, db=db, _=None)

    # Active purchase orders
    active_pos = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.is_archived == False,
        models.PurchaseOrder.status.in_([models.POStatus.draft, models.POStatus.pending, models.POStatus.ordered]),
    ).count()

    # Plant utilization + shifts needed
    plants = {p.id: p for p in db.query(models.Plant).all()}
    plants_over = 0
    util_rows = []
    for p in cap["plants"]:
        plant = plants.get(p["plant_id"])
        hps = plant.hours_per_shift if plant else 8
        shifts_needed = math.ceil(p["used_hours"] / hps) if hps and p["used_hours"] else 0
        if p["over_capacity"]:
            plants_over += 1
        util_rows.append({
            "plant_name": p["plant_name"], "capacity_hours": p["capacity_hours"],
            "used_hours": p["used_hours"], "utilization": p["utilization"],
            "over_capacity": p["over_capacity"], "shifts_needed": shifts_needed,
            "planned_units": p["planned_units"],
        })

    # Inventory status snapshot — critical/warning RM lines
    rm_alerts = [m for m in rm["by_material"]]  # totals; detail status comes from rm-stock page

    return {
        "kpis": {
            "monthly_forecast_units": fc["total_units"],
            "active_reorder_signals": rm["order_lines"] + active_pos,
            "plants_over_capacity": plants_over,
            "rm_critical_alerts": rm["critical"],
            "rm_warning": rm["warning"],
            "inventory_value": rm["inventory_value"],
            "fg_below_safety": fg["below_safety"],
            "produced_30d": fg["produced"],
            "dispatched_30d": fg["dispatched"],
            "revenue_30d": fg["revenue"],
        },
        "forecast_by_sku": fc["by_sku"],
        "forecast_by_plant": fc["by_plant"],
        "plant_utilization": util_rows,
        "fg_status": fg["status_rows"],
        "rm_totals": rm_alerts,
        "month": fc["month"],
    }
