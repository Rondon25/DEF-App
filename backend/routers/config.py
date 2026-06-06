"""Manufacturing master data / configuration (ASSUMPTIONS sheet):
plant capacity, SKU recipe params, raw materials, vendors, sourcing terms, BOM."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(prefix="/admin/config", tags=["config"])

CONFIG_ROLES = ("admin", "central_team", "operations")
EDIT_ROLES   = ("admin", "central_team")


# ── Plant capacity config ─────────────────────────────────────────────────────

class PlantCapacityIn(BaseModel):
    working_days_per_month: int | None = None
    shifts_per_day: int | None = None
    hours_per_shift: int | None = None
    max_capacity: float | None = None


def _plant_capacity_dict(p: models.Plant) -> dict:
    return {
        "id": p.id, "name": p.name, "location": p.location,
        "working_days_per_month": p.working_days_per_month,
        "shifts_per_day": p.shifts_per_day,
        "hours_per_shift": p.hours_per_shift,
        "effective_hours_per_day": p.effective_hours_per_day,
        "capacity_hours_month": p.capacity_hours_month,
        "max_capacity": p.max_capacity,
    }


@router.get("/plants")
def list_plant_config(db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    plants = db.query(models.Plant).filter(models.Plant.is_archived == False).order_by(models.Plant.name).all()
    return [_plant_capacity_dict(p) for p in plants]


@router.patch("/plants/{plant_id}")
def update_plant_config(plant_id: int, payload: PlantCapacityIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    p = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not p:
        raise HTTPException(404, "Plant not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _plant_capacity_dict(p)


# ── SKU recipe / economics config ─────────────────────────────────────────────

class SkuRecipeIn(BaseModel):
    granule_kg_per_unit: float | None = None
    packaging_per_unit: float | None = None
    target_output_per_shift_hour: float | None = None
    min_fg_safety_stock: float | None = None
    dispatch_cost_per_unit: float | None = None
    revenue_per_unit: float | None = None


def _sku_recipe_dict(s: models.SKU) -> dict:
    return {
        "id": s.id, "code": s.code, "name": s.name, "unit": s.unit,
        "volume_liters": s.volume_liters,
        "granule_kg_per_unit": s.granule_kg_per_unit,
        "packaging_per_unit": s.packaging_per_unit,
        "target_output_per_shift_hour": s.target_output_per_shift_hour,
        "min_fg_safety_stock": s.min_fg_safety_stock,
        "dispatch_cost_per_unit": s.dispatch_cost_per_unit,
        "revenue_per_unit": s.revenue_per_unit,
    }


@router.get("/skus")
def list_sku_config(db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    skus = db.query(models.SKU).filter(models.SKU.is_archived == False).order_by(models.SKU.code).all()
    return [_sku_recipe_dict(s) for s in skus]


@router.patch("/skus/{sku_id}")
def update_sku_config(sku_id: int, payload: SkuRecipeIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    s = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if not s:
        raise HTTPException(404, "SKU not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return _sku_recipe_dict(s)


# ── Raw materials ─────────────────────────────────────────────────────────────

class RawMaterialIn(BaseModel):
    name: str
    type: models.MaterialType = models.MaterialType.granule
    unit: str = "kg"


def _material_dict(m: models.RawMaterial) -> dict:
    return {"id": m.id, "name": m.name, "type": m.type.value if m.type else None, "unit": m.unit, "is_active": m.is_active}


@router.get("/materials")
def list_materials(db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    rows = db.query(models.RawMaterial).filter(models.RawMaterial.is_archived == False).order_by(models.RawMaterial.name).all()
    return [_material_dict(m) for m in rows]


@router.post("/materials", status_code=201)
def create_material(payload: RawMaterialIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    m = models.RawMaterial(**payload.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return _material_dict(m)


@router.patch("/materials/{material_id}")
def update_material(material_id: int, payload: RawMaterialIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    m = db.query(models.RawMaterial).filter(models.RawMaterial.id == material_id).first()
    if not m:
        raise HTTPException(404, "Material not found")
    for k, v in payload.model_dump().items():
        setattr(m, k, v)
    db.commit(); db.refresh(m)
    return _material_dict(m)


@router.post("/materials/{material_id}/archive")
def archive_material(material_id: int, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    m = db.query(models.RawMaterial).filter(models.RawMaterial.id == material_id).first()
    if not m:
        raise HTTPException(404, "Material not found")
    m.is_archived = True; db.commit()
    return {"message": "Material archived"}


# ── Vendors ───────────────────────────────────────────────────────────────────

class VendorIn(BaseModel):
    name: str
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None


def _vendor_dict(v: models.Vendor) -> dict:
    return {"id": v.id, "name": v.name, "contact_name": v.contact_name, "phone": v.phone, "email": v.email, "is_active": v.is_active}


@router.get("/vendors")
def list_vendors(db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    rows = db.query(models.Vendor).filter(models.Vendor.is_archived == False).order_by(models.Vendor.name).all()
    return [_vendor_dict(v) for v in rows]


@router.post("/vendors", status_code=201)
def create_vendor(payload: VendorIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    v = models.Vendor(**payload.model_dump())
    db.add(v); db.commit(); db.refresh(v)
    return _vendor_dict(v)


@router.patch("/vendors/{vendor_id}")
def update_vendor(vendor_id: int, payload: VendorIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(404, "Vendor not found")
    for k, val in payload.model_dump().items():
        setattr(v, k, val)
    db.commit(); db.refresh(v)
    return _vendor_dict(v)


@router.post("/vendors/{vendor_id}/archive")
def archive_vendor(vendor_id: int, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    v = db.query(models.Vendor).filter(models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(404, "Vendor not found")
    v.is_archived = True; db.commit()
    return {"message": "Vendor archived"}


# ── Vendor sourcing terms (vendor × material × plant) ─────────────────────────

class VendorMaterialIn(BaseModel):
    vendor_id: int
    material_id: int
    plant_id: int | None = None
    lead_time_days: int = 7
    safety_stock_days: int = 3
    min_order_qty: float = 0.0
    unit_cost: float = 0.0


def _vm_dict(db: Session, vm: models.VendorMaterial) -> dict:
    return {
        "id": vm.id, "vendor_id": vm.vendor_id, "material_id": vm.material_id, "plant_id": vm.plant_id,
        "vendor_name": vm.vendor.name if vm.vendor else None,
        "material_name": vm.material.name if vm.material else None,
        "plant_name": vm.plant.name if vm.plant else "All plants",
        "lead_time_days": vm.lead_time_days, "safety_stock_days": vm.safety_stock_days,
        "min_order_qty": vm.min_order_qty, "unit_cost": vm.unit_cost,
    }


@router.get("/sourcing")
def list_sourcing(db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    rows = db.query(models.VendorMaterial).filter(models.VendorMaterial.is_archived == False).all()
    return [_vm_dict(db, vm) for vm in rows]


@router.post("/sourcing", status_code=201)
def create_sourcing(payload: VendorMaterialIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    vm = models.VendorMaterial(**payload.model_dump())
    db.add(vm); db.commit(); db.refresh(vm)
    return _vm_dict(db, vm)


@router.patch("/sourcing/{vm_id}")
def update_sourcing(vm_id: int, payload: VendorMaterialIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    vm = db.query(models.VendorMaterial).filter(models.VendorMaterial.id == vm_id).first()
    if not vm:
        raise HTTPException(404, "Sourcing entry not found")
    for k, v in payload.model_dump().items():
        setattr(vm, k, v)
    db.commit(); db.refresh(vm)
    return _vm_dict(db, vm)


@router.delete("/sourcing/{vm_id}")
def delete_sourcing(vm_id: int, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    vm = db.query(models.VendorMaterial).filter(models.VendorMaterial.id == vm_id).first()
    if not vm:
        raise HTTPException(404, "Sourcing entry not found")
    vm.is_archived = True; db.commit()
    return {"message": "Sourcing entry removed"}


# ── Bill of materials (SKU recipe → raw materials) ────────────────────────────

class BomIn(BaseModel):
    sku_id: int
    material_id: int
    qty_per_unit: float


def _bom_dict(db: Session, b: models.BillOfMaterials) -> dict:
    return {
        "id": b.id, "sku_id": b.sku_id, "material_id": b.material_id,
        "sku_code": b.sku.code if b.sku else None, "sku_name": b.sku.name if b.sku else None,
        "material_name": b.material.name if b.material else None,
        "material_unit": b.material.unit if b.material else None,
        "qty_per_unit": b.qty_per_unit,
    }


@router.get("/bom")
def list_bom(sku_id: int | None = None, db: Session = Depends(get_db), _=Depends(require_role(*CONFIG_ROLES))):
    q = db.query(models.BillOfMaterials)
    if sku_id:
        q = q.filter(models.BillOfMaterials.sku_id == sku_id)
    return [_bom_dict(db, b) for b in q.all()]


@router.post("/bom", status_code=201)
def create_bom(payload: BomIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    b = models.BillOfMaterials(**payload.model_dump())
    db.add(b); db.commit(); db.refresh(b)
    return _bom_dict(db, b)


@router.patch("/bom/{bom_id}")
def update_bom(bom_id: int, payload: BomIn, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    b = db.query(models.BillOfMaterials).filter(models.BillOfMaterials.id == bom_id).first()
    if not b:
        raise HTTPException(404, "BOM entry not found")
    for k, v in payload.model_dump().items():
        setattr(b, k, v)
    db.commit(); db.refresh(b)
    return _bom_dict(db, b)


@router.delete("/bom/{bom_id}")
def delete_bom(bom_id: int, db: Session = Depends(get_db), _=Depends(require_role(*EDIT_ROLES))):
    b = db.query(models.BillOfMaterials).filter(models.BillOfMaterials.id == bom_id).first()
    if not b:
        raise HTTPException(404, "BOM entry not found")
    db.delete(b); db.commit()
    return {"message": "BOM entry removed"}
