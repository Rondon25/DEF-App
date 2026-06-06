"""Raw-material inventory (daily ledger + reorder points) and procurement / purchase orders.
Implements the RM_INVENTORY and REORDER_TRACKER sheets."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["rm_inventory"])

RM_ROLES   = ("admin", "central_team", "operations")
EDIT_ROLES = ("admin", "central_team", "operations")
COVER_TARGET_DAYS = 30   # how much cover a suggested reorder aims to restore


# ── sourcing helper ───────────────────────────────────────────────────────────

def _sourcing_for(db: Session, material_id: int, plant_id: int):
    """Best sourcing term: prefer plant-specific, fall back to all-plants."""
    q = db.query(models.VendorMaterial).filter(
        models.VendorMaterial.material_id == material_id,
        models.VendorMaterial.is_archived == False,
    )
    specific = q.filter(models.VendorMaterial.plant_id == plant_id).first()
    if specific:
        return specific
    return q.filter(models.VendorMaterial.plant_id == None).first()


def _rm_row(db: Session, st: models.RawMaterialStock) -> dict:
    src = _sourcing_for(db, st.material_id, st.plant_id)
    lead = src.lead_time_days if src else 7
    safety_days = src.safety_stock_days if src else 3
    moq = src.min_order_qty if src else 0
    unit_cost = src.unit_cost if src else 0
    vendor_id = src.vendor_id if src else None
    vendor_name = src.vendor.name if src and src.vendor else None

    adu = st.avg_daily_usage or 0
    safety_stock = round(safety_days * adu, 2)
    rop = round(adu * lead + safety_stock, 2)
    closing = round(st.quantity or 0, 2)
    days_cover = round(closing / adu, 1) if adu else None
    order_required = closing <= rop
    if order_required:
        suggested = max(moq, round(adu * (lead + safety_days + COVER_TARGET_DAYS) - closing))
    else:
        suggested = 0
    if closing <= rop:
        status = "critical"
    elif closing <= rop * 1.2:
        status = "warning"
    else:
        status = "ok"

    return {
        "id": st.id, "plant_id": st.plant_id, "plant_name": st.plant.name if st.plant else None,
        "material_id": st.material_id, "material_name": st.material.name if st.material else None,
        "unit": st.material.unit if st.material else None,
        "quantity": closing, "avg_daily_usage": adu,
        "lead_time_days": lead, "safety_stock": safety_stock, "reorder_point": rop,
        "days_of_cover": days_cover, "status": status,
        "order_required": order_required, "suggested_qty": suggested,
        "moq": moq, "unit_cost": unit_cost,
        "vendor_id": vendor_id, "vendor_name": vendor_name,
    }


# ── RM stock list / summary ───────────────────────────────────────────────────

@router.get("/admin/rm-stock")
def list_rm_stock(plant_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(*RM_ROLES))):
    q = db.query(models.RawMaterialStock)
    if plant_id:
        q = q.filter(models.RawMaterialStock.plant_id == plant_id)
    rows = q.all()
    out = [_rm_row(db, st) for st in rows]
    out.sort(key=lambda r: ({"critical": 0, "warning": 1, "ok": 2}[r["status"]], r["material_name"] or ""))
    return out


@router.get("/admin/rm-stock/summary")
def rm_summary(db: Session = Depends(get_db), _=Depends(require_role(*RM_ROLES))):
    rows = [_rm_row(db, st) for st in db.query(models.RawMaterialStock).all()]
    critical = sum(1 for r in rows if r["status"] == "critical")
    warning = sum(1 for r in rows if r["status"] == "warning")
    order_lines = sum(1 for r in rows if r["order_required"])
    inv_value = round(sum((r["quantity"] or 0) * (r["unit_cost"] or 0) for r in rows), 2)
    # by-material totals across plants
    by_mat: dict = {}
    for r in rows:
        m = r["material_name"]
        by_mat.setdefault(m, {"name": m, "qty": 0, "unit": r["unit"]})
        by_mat[m]["qty"] += r["quantity"] or 0
    return {
        "total_lines": len(rows), "critical": critical, "warning": warning,
        "order_lines": order_lines, "inventory_value": inv_value,
        "by_material": sorted(by_mat.values(), key=lambda x: -x["qty"]),
    }


# ── Set stock / record daily movement ─────────────────────────────────────────

class RmStockSet(BaseModel):
    plant_id: int
    material_id: int
    quantity: float
    avg_daily_usage: float | None = None


def _upsert_stock(db: Session, plant_id: int, material_id: int):
    st = db.query(models.RawMaterialStock).filter(
        models.RawMaterialStock.plant_id == plant_id,
        models.RawMaterialStock.material_id == material_id,
    ).first()
    if not st:
        st = models.RawMaterialStock(plant_id=plant_id, material_id=material_id, quantity=0)
        db.add(st); db.flush()
    return st


@router.post("/admin/rm-stock")
def set_rm_stock(payload: RmStockSet, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    if not db.query(models.Plant).filter(models.Plant.id == payload.plant_id).first():
        raise HTTPException(404, "Plant not found")
    if not db.query(models.RawMaterial).filter(models.RawMaterial.id == payload.material_id).first():
        raise HTTPException(404, "Material not found")
    st = _upsert_stock(db, payload.plant_id, payload.material_id)
    st.quantity = payload.quantity
    if payload.avg_daily_usage is not None:
        st.avg_daily_usage = payload.avg_daily_usage
    db.commit(); db.refresh(st)
    return _rm_row(db, st)


class RmMovementIn(BaseModel):
    plant_id: int
    material_id: int
    qty_in: float = 0.0
    qty_out: float = 0.0
    reason: str = "adjustment"
    note: str | None = None
    movement_date: date | None = None


def post_rm_movement(db: Session, plant_id: int, material_id: int, *, qty_in: float = 0.0,
                     qty_out: float = 0.0, reason: str = "adjustment", note: str | None = None,
                     staff_id: int | None = None, movement_date=None):
    """Post a raw-material StockMovement and update stock. Shared by manual entry + production runs."""
    st = _upsert_stock(db, plant_id, material_id)
    opening = st.quantity or 0
    closing = opening + qty_in - qty_out
    db.add(models.StockMovement(
        entity=models.StockEntity.raw_material, plant_id=plant_id, material_id=material_id,
        movement_date=movement_date or date.today(), opening=opening, qty_in=qty_in,
        qty_out=qty_out, closing=closing, reason=reason, note=note, staff_id=staff_id,
    ))
    st.quantity = closing
    db.flush()
    return st


@router.post("/admin/rm-stock/movement")
def record_movement(payload: RmMovementIn, db: Session = Depends(get_db), user=Depends(require_role(*EDIT_ROLES))):
    st = post_rm_movement(db, payload.plant_id, payload.material_id, qty_in=payload.qty_in,
                          qty_out=payload.qty_out, reason=payload.reason, note=payload.note,
                          staff_id=getattr(user, "id", None), movement_date=payload.movement_date)
    db.commit()
    return _rm_row(db, st)


@router.get("/admin/rm-stock/{stock_id}/ledger")
def rm_ledger(stock_id: int, db: Session = Depends(get_db), _=Depends(require_role(*RM_ROLES))):
    st = db.query(models.RawMaterialStock).filter(models.RawMaterialStock.id == stock_id).first()
    if not st:
        raise HTTPException(404, "Stock line not found")
    rows = db.query(models.StockMovement).filter(
        models.StockMovement.entity == models.StockEntity.raw_material,
        models.StockMovement.plant_id == st.plant_id,
        models.StockMovement.material_id == st.material_id,
    ).order_by(models.StockMovement.movement_date.desc(), models.StockMovement.id.desc()).limit(60).all()
    return [{
        "id": m.id, "date": m.movement_date.isoformat(), "opening": m.opening,
        "qty_in": m.qty_in, "qty_out": m.qty_out, "closing": m.closing,
        "reason": m.reason, "note": m.note,
    } for m in rows]


# ── Purchase orders / reorder tracker ─────────────────────────────────────────

def _po_dict(po: models.PurchaseOrder) -> dict:
    return {
        "id": po.id, "po_number": po.po_number,
        "plant_id": po.plant_id, "plant_name": po.plant.name if po.plant else None,
        "material_id": po.material_id, "material_name": po.material.name if po.material else None,
        "unit": po.material.unit if po.material else None,
        "vendor_id": po.vendor_id, "vendor_name": po.vendor.name if po.vendor else None,
        "trigger_date": po.trigger_date.isoformat() if po.trigger_date else None,
        "stock_at_trigger": po.stock_at_trigger, "reorder_point": po.reorder_point,
        "order_qty": po.order_qty, "lead_time_days": po.lead_time_days,
        "expected_arrival": po.expected_arrival.isoformat() if po.expected_arrival else None,
        "unit_cost": po.unit_cost, "total_cost": round((po.order_qty or 0) * (po.unit_cost or 0), 2),
        "status": po.status.value, "auto_generated": po.auto_generated, "notes": po.notes,
    }


def _next_po_number(db: Session) -> str:
    n = db.query(func.count(models.PurchaseOrder.id)).scalar() or 0
    return f"PO-{date.today().strftime('%Y%m')}-{n + 1:04d}"


@router.get("/admin/purchase-orders")
def list_pos(status: str | None = None, db: Session = Depends(get_db), _=Depends(require_role(*RM_ROLES))):
    q = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.is_archived == False)
    if status:
        q = q.filter(models.PurchaseOrder.status == status)
    rows = q.order_by(models.PurchaseOrder.created_at.desc()).all()
    return [_po_dict(p) for p in rows]


class PoIn(BaseModel):
    plant_id: int
    material_id: int
    vendor_id: int | None = None
    order_qty: float
    lead_time_days: int = 7
    unit_cost: float = 0.0
    expected_arrival: date | None = None
    notes: str | None = None


@router.post("/admin/purchase-orders", status_code=201)
def create_po(payload: PoIn, db: Session = Depends(get_db), user=Depends(require_role(*EDIT_ROLES))):
    st = db.query(models.RawMaterialStock).filter(
        models.RawMaterialStock.plant_id == payload.plant_id,
        models.RawMaterialStock.material_id == payload.material_id,
    ).first()
    row = _rm_row(db, st) if st else None
    eta = payload.expected_arrival or (date.today() + timedelta(days=payload.lead_time_days))
    po = models.PurchaseOrder(
        po_number=_next_po_number(db), plant_id=payload.plant_id, material_id=payload.material_id,
        vendor_id=payload.vendor_id, trigger_date=date.today(),
        stock_at_trigger=row["quantity"] if row else 0, reorder_point=row["reorder_point"] if row else 0,
        order_qty=payload.order_qty, lead_time_days=payload.lead_time_days, expected_arrival=eta,
        unit_cost=payload.unit_cost, status=models.POStatus.draft, auto_generated=False,
        notes=payload.notes, created_by=getattr(user, "id", None),
    )
    db.add(po); db.commit(); db.refresh(po)
    return _po_dict(po)


@router.post("/admin/purchase-orders/generate")
def generate_pos(db: Session = Depends(get_db), user=Depends(require_role(*EDIT_ROLES))):
    """Create draft POs for every RM line currently below its reorder point (skips ones with an open PO)."""
    created = []
    for st in db.query(models.RawMaterialStock).all():
        row = _rm_row(db, st)
        if not row["order_required"]:
            continue
        existing = db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.plant_id == st.plant_id,
            models.PurchaseOrder.material_id == st.material_id,
            models.PurchaseOrder.is_archived == False,
            models.PurchaseOrder.status.in_([models.POStatus.draft, models.POStatus.pending, models.POStatus.ordered]),
        ).first()
        if existing:
            continue
        eta = date.today() + timedelta(days=row["lead_time_days"])
        po = models.PurchaseOrder(
            po_number=_next_po_number(db), plant_id=st.plant_id, material_id=st.material_id,
            vendor_id=row["vendor_id"], trigger_date=date.today(),
            stock_at_trigger=row["quantity"], reorder_point=row["reorder_point"],
            order_qty=row["suggested_qty"], lead_time_days=row["lead_time_days"], expected_arrival=eta,
            unit_cost=row["unit_cost"], status=models.POStatus.draft, auto_generated=True,
            notes="Auto-generated from reorder signal", created_by=getattr(user, "id", None),
        )
        db.add(po); db.flush()
        created.append(_po_dict(po))
    db.commit()
    return {"created": len(created), "purchase_orders": created}


class PoStatusIn(BaseModel):
    status: models.POStatus
    order_qty: float | None = None
    vendor_id: int | None = None
    expected_arrival: date | None = None
    notes: str | None = None


@router.patch("/admin/purchase-orders/{po_id}")
def update_po(po_id: int, payload: PoStatusIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    prev_status = po.status
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(po, k, v)
    # When marked arrived, post a receipt movement into stock
    if payload.status == models.POStatus.arrived and prev_status != models.POStatus.arrived:
        st = _upsert_stock(db, po.plant_id, po.material_id)
        opening = st.quantity or 0
        closing = opening + (po.order_qty or 0)
        db.add(models.StockMovement(
            entity=models.StockEntity.raw_material, plant_id=po.plant_id, material_id=po.material_id,
            movement_date=date.today(), opening=opening, qty_in=po.order_qty or 0, qty_out=0,
            closing=closing, reason="receipt", note=f"PO {po.po_number} received",
        ))
        st.quantity = closing
    db.commit(); db.refresh(po)
    return _po_dict(po)


@router.post("/admin/purchase-orders/{po_id}/archive")
def archive_po(po_id: int, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404, "Purchase order not found")
    po.is_archived = True; db.commit()
    return {"message": "Purchase order archived"}
