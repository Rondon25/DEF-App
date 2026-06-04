"""Public SKU catalogue + staff price management."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import get_current_staff, require_role

router = APIRouter(tags=["catalog"])


class SKUOut(BaseModel):
    id: int
    sku_code: str = ""
    code: str
    name: str
    description: str | None
    volume_liters: float
    unit: str
    current_price: float
    min_order_qty: float = 1.0
    is_active: bool

    @classmethod
    def from_orm_with_alias(cls, obj):
        data = {
            "id": obj.id,
            "sku_code": obj.code,
            "code": obj.code,
            "name": obj.name,
            "description": obj.description,
            "volume_liters": obj.volume_liters,
            "unit": obj.unit,
            "current_price": obj.current_price,
            "min_order_qty": getattr(obj, "min_order_qty", 1.0),
            "is_active": obj.is_active,
        }
        return cls(**data)

    class Config:
        from_attributes = True


class SKUCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    volume_liters: float = 0.0
    unit: str = "unit"
    current_price: float


class SKUEdit(BaseModel):
    name: str | None = None
    description: str | None = None
    volume_liters: float | None = None
    unit: str | None = None


class SKUPriceUpdate(BaseModel):
    new_price: float
    effective_from: date
    notes: str | None = None


# ── Public catalogue (active SKUs) ────────────────────────────────────────────

def _active_skus(db):
    skus = db.query(models.SKU).filter(models.SKU.is_active == True).all()
    return [SKUOut.from_orm_with_alias(s) for s in skus]

@router.get("/catalog", response_model=list[SKUOut])
def get_catalog(db: Session = Depends(get_db)):
    return _active_skus(db)

@router.get("/catalog/skus", response_model=list[SKUOut])
def get_catalog_skus(db: Session = Depends(get_db)):
    return _active_skus(db)


# ── Staff: manage SKUs ────────────────────────────────────────────────────────

@router.get("/admin/skus", response_model=list[SKUOut])
def list_all_skus(
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    skus = db.query(models.SKU).all()
    return [SKUOut.from_orm_with_alias(s) for s in skus]


@router.post("/admin/skus", response_model=SKUOut, status_code=201)
def create_sku(
    payload: SKUCreate,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    if db.query(models.SKU).filter(models.SKU.code == payload.code).first():
        raise HTTPException(status_code=400, detail="SKU code already exists")
    sku = models.SKU(**payload.model_dump())
    db.add(sku)
    db.commit()
    db.refresh(sku)
    return sku


@router.patch("/admin/skus/{sku_id}", response_model=SKUOut)
def edit_sku(
    sku_id: int,
    payload: SKUEdit,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    sku = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    if payload.name is not None:          sku.name          = payload.name
    if payload.description is not None:   sku.description   = payload.description
    if payload.volume_liters is not None: sku.volume_liters = payload.volume_liters
    if payload.unit is not None:          sku.unit          = payload.unit
    db.commit()
    db.refresh(sku)
    return SKUOut.from_orm_with_alias(sku)


@router.patch("/admin/skus/{sku_id}/price", response_model=SKUOut)
def update_sku_price(
    sku_id: int,
    payload: SKUPriceUpdate,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    sku = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")

    # Close current price history
    current = db.query(models.SKUPriceHistory).filter(
        models.SKUPriceHistory.sku_id == sku_id,
        models.SKUPriceHistory.effective_to == None,
    ).first()
    if current:
        current.effective_to = payload.effective_from

    # Add new price record
    db.add(models.SKUPriceHistory(
        sku_id=sku_id,
        price=payload.new_price,
        effective_from=payload.effective_from,
        updated_by=staff.id,
        notes=payload.notes,
    ))

    sku.current_price = payload.new_price
    sku.updated_at = date.today()
    db.commit()
    db.refresh(sku)
    return sku


@router.patch("/admin/skus/{sku_id}/toggle")
def toggle_sku(
    sku_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    sku = db.query(models.SKU).filter(models.SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    sku.is_active = not sku.is_active
    db.commit()
    return {"id": sku.id, "is_active": sku.is_active}
