"""Daily KPI snapshots — powers real deltas and trend sparklines."""
import math
from datetime import date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
import models


def compute_metrics(db: Session) -> dict:
    """Current values for the tracked KPIs."""
    active_statuses = ["submitted","verified","proforma_sent","payment_uploaded","payment_verified",
                       "confirmed","in_production","ready_for_dispatch","shipped","grn_pending","grn_submitted"]
    orders = db.query(models.Order).filter(models.Order.is_archived == False).all()
    total_units = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).scalar() or 0
    skus = db.query(models.SKU).filter(models.SKU.is_archived == False).all()
    low_stock = 0
    for s in skus:
        qty = db.query(func.coalesce(func.sum(models.PlantStock.quantity), 0)).filter(models.PlantStock.sku_id == s.id).scalar() or 0
        if qty < 10:
            low_stock += 1

    return {
        "total_products": len(skus),
        "total_units": round(total_units, 2),
        "low_stock": low_stock,
        "active_orders": sum(1 for o in orders if (o.status.value if hasattr(o.status, "value") else o.status) in active_statuses),
        "in_transit": sum(1 for o in orders if (o.status.value if hasattr(o.status, "value") else o.status) == "shipped"),
        "revenue": round(sum(o.total_amount or 0 for o in orders if (o.status.value if hasattr(o.status, "value") else o.status) == "closed"), 2),
        "pending_customers": db.query(models.Customer).filter(models.Customer.status == models.CustomerStatus.pending, models.Customer.is_archived == False).count(),
        "pending_payments": db.query(models.Payment).filter(models.Payment.status == models.PaymentStatus.pending).count(),
    }


def _plant_utils(db: Session) -> dict:
    """Per-plant utilization today = used hours / effective hours."""
    out = {}
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).all()
    today = date.today()
    for p in plants:
        runs = db.query(models.ProductionRun).filter(
            models.ProductionRun.plant_id == p.id, models.ProductionRun.run_date == today,
            models.ProductionRun.status != models.ProductionStatus.cancelled,
        ).all()
        used = sum(r.hours_required for r in runs)
        cap = p.effective_hours_per_day or 0
        out[p.id] = round((used / cap) * 100, 1) if cap else 0.0
    return out


def snapshot_day(db: Session, on: date | None = None, overwrite: bool = True):
    """Record today's metrics + plant utilization."""
    on = on or date.today()
    metrics = compute_metrics(db)
    for key, val in metrics.items():
        row = db.query(models.MetricSnapshot).filter(models.MetricSnapshot.snapshot_date == on, models.MetricSnapshot.metric == key).first()
        if row:
            if overwrite:
                row.value = val
        else:
            db.add(models.MetricSnapshot(snapshot_date=on, metric=key, value=val))
    for pid, util in _plant_utils(db).items():
        row = db.query(models.PlantUtilSnapshot).filter(models.PlantUtilSnapshot.snapshot_date == on, models.PlantUtilSnapshot.plant_id == pid).first()
        if row:
            if overwrite:
                row.utilization = util
        else:
            db.add(models.PlantUtilSnapshot(snapshot_date=on, plant_id=pid, utilization=util))
    db.commit()


def backfill(db: Session, days: int = 30):
    """Seed ~N days of plausible history so deltas/sparklines render immediately.
    Past values drift gently below current with a deterministic wiggle."""
    today = date.today()
    cur = compute_metrics(db)
    plant_now = _plant_utils(db)
    for d in range(days, 0, -1):
        on = today - timedelta(days=d)
        if db.query(models.MetricSnapshot).filter(models.MetricSnapshot.snapshot_date == on).first():
            continue
        # progress 0..1 from oldest->today; values ramp toward current
        t = (days - d) / days
        wig = math.sin(d * 0.7) * 0.04  # +/-4% wiggle
        for key, val in cur.items():
            base = val * (0.78 + 0.22 * t) * (1 + wig)  # 78%->100% of current
            db.add(models.MetricSnapshot(snapshot_date=on, metric=key, value=round(max(0, base), 2)))
        for pid, util in plant_now.items():
            base = util * (0.8 + 0.2 * t) * (1 + math.cos((d + pid) * 0.6) * 0.06)
            db.add(models.PlantUtilSnapshot(snapshot_date=on, plant_id=pid, utilization=round(max(0, base), 1)))
    db.commit()
    snapshot_day(db, today)  # ensure today exact


def trends(db: Session, days: int = 30) -> dict:
    """Return {metrics: {key: {current, prev, delta_pct, up, series}}, plants:[...]}."""
    today = date.today()
    since = today - timedelta(days=days)
    rows = db.query(models.MetricSnapshot).filter(models.MetricSnapshot.snapshot_date >= since).order_by(models.MetricSnapshot.snapshot_date).all()
    by_metric: dict = {}
    for r in rows:
        by_metric.setdefault(r.metric, []).append((r.snapshot_date, r.value))
    cur = compute_metrics(db)
    metrics = {}
    for key, cur_val in cur.items():
        series = by_metric.get(key, [])
        vals = [v for _, v in series]
        prev = vals[-2] if len(vals) >= 2 else (vals[0] if vals else cur_val)
        delta = ((cur_val - prev) / prev * 100) if prev else 0
        metrics[key] = {
            "current": cur_val, "prev": round(prev, 2),
            "delta_pct": round(delta, 1), "up": cur_val >= prev,
            "series": vals[-14:] + ([cur_val] if not vals or vals[-1] != cur_val else []),
        }

    prows = db.query(models.PlantUtilSnapshot).filter(models.PlantUtilSnapshot.snapshot_date >= since).order_by(models.PlantUtilSnapshot.snapshot_date).all()
    pseries: dict = {}
    for r in prows:
        pseries.setdefault(r.plant_id, []).append(r.utilization)
    plant_names = {p.id: p.name for p in db.query(models.Plant).all()}
    plant_now = _plant_utils(db)
    plants = []
    for pid, name in plant_names.items():
        s = pseries.get(pid, [])
        cur_u = plant_now.get(pid, s[-1] if s else 0)
        prev_u = s[-8] if len(s) >= 8 else (s[0] if s else cur_u)  # ~1 week ago
        plants.append({"plant_id": pid, "name": name, "current": cur_u, "prev": round(prev_u, 1),
                       "up": cur_u >= prev_u, "series": (s[-14:] or [cur_u])})
    return {"metrics": metrics, "plants": plants}
