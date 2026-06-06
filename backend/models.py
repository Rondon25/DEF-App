from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    ForeignKey, Text, Enum as SAEnum, BigInteger
)
from sqlalchemy.orm import relationship
import enum
from database import Base


# ─── ENUMS ───────────────────────────────────────────────────────────────────

class StaffRole(str, enum.Enum):
    admin          = "admin"
    central_team   = "central_team"
    finance        = "finance"
    sales          = "sales"
    operations     = "operations"


class CustomerStatus(str, enum.Enum):
    pending    = "pending"     # awaiting central team approval
    active     = "active"
    suspended  = "suspended"
    rejected   = "rejected"


class OTPChannel(str, enum.Enum):
    whatsapp = "whatsapp"
    sms      = "sms"


class OrderStatus(str, enum.Enum):
    draft               = "draft"
    submitted           = "submitted"
    verified            = "verified"
    proforma_sent       = "proforma_sent"
    payment_uploaded    = "payment_uploaded"
    payment_verified    = "payment_verified"
    confirmed           = "confirmed"
    in_production       = "in_production"
    ready_for_dispatch  = "ready_for_dispatch"
    shipped             = "shipped"
    delivered           = "delivered"
    grn_pending         = "grn_pending"
    grn_submitted       = "grn_submitted"
    closed              = "closed"
    cancelled           = "cancelled"


class PaymentMethod(str, enum.Enum):
    bank_transfer = "bank_transfer"
    cash          = "cash"
    credit        = "credit"


class PaymentStatus(str, enum.Enum):
    pending  = "pending"
    verified = "verified"
    rejected = "rejected"


class WaDirection(str, enum.Enum):
    outbound = "outbound"
    inbound  = "inbound"


# ─── STAFF USERS ─────────────────────────────────────────────────────────────

class StaffUser(Base):
    __tablename__ = "staff_users"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(200), nullable=False)
    email          = Column(String(255), unique=True, nullable=False, index=True)
    phone_number   = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role           = Column(SAEnum(StaffRole), nullable=False, default=StaffRole.sales)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    approved_customers = relationship("Customer", back_populates="approved_by_user", foreign_keys="Customer.approved_by")
    verified_payments  = relationship("Payment", back_populates="verified_by_user", foreign_keys="Payment.verified_by")


# ─── CUSTOMERS ───────────────────────────────────────────────────────────────

class Customer(Base):
    __tablename__ = "customers"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(200), nullable=False)
    phone_number     = Column(String(30), unique=True, nullable=False, index=True)
    company_name     = Column(String(200), nullable=True)
    address          = Column(Text, nullable=True)
    city             = Column(String(100), nullable=True)
    state            = Column("country", String(100), nullable=True)
    geo_lat          = Column(Float, nullable=True)
    geo_lng          = Column(Float, nullable=True)
    is_credit_account = Column(Boolean, default=False)
    credit_limit     = Column(Float, default=0.0)
    assigned_salesperson_id = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    status           = Column(SAEnum(CustomerStatus), default=CustomerStatus.pending)
    approved_by      = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    approved_at      = Column(DateTime, nullable=True)
    otp_code         = Column(String(10), nullable=True)
    otp_expires_at   = Column(DateTime, nullable=True)
    otp_channel      = Column(SAEnum(OTPChannel), default=OTPChannel.whatsapp)
    is_archived      = Column(Boolean, default=False)  # soft delete
    created_at       = Column(DateTime, default=datetime.utcnow)

    approved_by_user     = relationship("StaffUser", back_populates="approved_customers", foreign_keys=[approved_by])
    assigned_salesperson = relationship("StaffUser", foreign_keys=[assigned_salesperson_id])
    orders               = relationship("Order", back_populates="customer")
    wa_messages          = relationship("WhatsAppMessage", back_populates="customer")
    delivery_locations   = relationship("CustomerDeliveryLocation", back_populates="customer", cascade="all, delete-orphan")


# ─── CUSTOMER DELIVERY LOCATIONS ─────────────────────────────────────────────

class CustomerDeliveryLocation(Base):
    __tablename__ = "customer_delivery_locations"

    id          = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    label       = Column(String(100), nullable=False, default="Delivery Location")
    address     = Column(Text, nullable=True)
    city        = Column(String(100), nullable=True)
    state       = Column(String(100), nullable=True)
    is_primary  = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="delivery_locations")


# ─── SKU & PRICING ───────────────────────────────────────────────────────────

class SKU(Base):
    __tablename__ = "skus"

    id                   = Column(Integer, primary_key=True, index=True)
    code                 = Column(String(50), unique=True, nullable=False)
    name                 = Column(String(200), nullable=False)
    description          = Column(Text, nullable=True)
    volume_liters        = Column(Float, default=0.0)
    unit                 = Column(String(50), default="unit")
    current_price        = Column(Float, nullable=False)
    stock_qty            = Column(Float, nullable=True)   # legacy total; now derived from plant_stocks
    # ── Manufacturing / recipe parameters (from ASSUMPTIONS sheet) ──
    granule_kg_per_unit          = Column(Float, default=0.0)   # granules consumed per finished unit
    packaging_per_unit           = Column(Float, default=0.0)   # packaging items per finished unit
    target_output_per_shift_hour = Column(Float, default=0.0)   # units producible per shift-hour
    min_fg_safety_stock          = Column(Float, default=0.0)   # min finished-goods buffer
    dispatch_cost_per_unit       = Column(Float, default=0.0)
    revenue_per_unit             = Column(Float, default=0.0)
    is_active            = Column(Boolean, default=True)
    is_archived          = Column(Boolean, default=False)  # soft delete
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    price_history = relationship("SKUPriceHistory", back_populates="sku")
    order_items   = relationship("OrderItem", back_populates="sku")
    plant_stocks  = relationship("PlantStock", back_populates="sku", cascade="all, delete-orphan")
    bom_items     = relationship("BillOfMaterials", back_populates="sku", cascade="all, delete-orphan")


# ─── PLANTS (FACTORIES / WAREHOUSES) ─────────────────────────────────────────

class Plant(Base):
    __tablename__ = "plants"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(150), nullable=False)
    location      = Column(String(200), nullable=True)
    manager_name  = Column(String(150), nullable=True)
    manager_phone = Column(String(30), nullable=True)
    manager_email = Column(String(255), nullable=True)
    max_capacity  = Column(Float, nullable=True)   # max units the plant can hold
    # ── Production capacity config (from ASSUMPTIONS sheet) ──
    working_days_per_month = Column(Integer, default=26)
    shifts_per_day         = Column(Integer, default=3)
    hours_per_shift        = Column(Integer, default=8)
    is_active     = Column(Boolean, default=True)
    is_archived   = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    stocks       = relationship("PlantStock", back_populates="plant", cascade="all, delete-orphan")
    rm_stocks    = relationship("RawMaterialStock", back_populates="plant", cascade="all, delete-orphan")

    @property
    def effective_hours_per_day(self) -> float:
        return (self.shifts_per_day or 0) * (self.hours_per_shift or 0)

    @property
    def capacity_hours_month(self) -> float:
        return self.effective_hours_per_day * (self.working_days_per_month or 0)


class PlantStock(Base):
    __tablename__ = "plant_stocks"

    id         = Column(Integer, primary_key=True, index=True)
    plant_id   = Column(Integer, ForeignKey("plants.id"), nullable=False)
    sku_id     = Column(Integer, ForeignKey("skus.id"), nullable=False)
    quantity   = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plant = relationship("Plant", back_populates="stocks")
    sku   = relationship("SKU", back_populates="plant_stocks")


# ─── RAW MATERIALS / VENDORS / BOM (manufacturing master data) ───────────────

class MaterialType(str, enum.Enum):
    granule   = "granule"
    packaging = "packaging"
    label     = "label"
    misc      = "misc"


class RawMaterial(Base):
    __tablename__ = "raw_materials"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(150), nullable=False)        # e.g. "Granules", "Bucket 5L"
    type        = Column(SAEnum(MaterialType), default=MaterialType.granule)
    unit        = Column(String(30), default="kg")           # kg / units
    is_active   = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    stocks      = relationship("RawMaterialStock", back_populates="material", cascade="all, delete-orphan")
    bom_items   = relationship("BillOfMaterials", back_populates="material", cascade="all, delete-orphan")
    vendor_links = relationship("VendorMaterial", back_populates="material", cascade="all, delete-orphan")


class Vendor(Base):
    __tablename__ = "vendors"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(150), nullable=False)
    contact_name = Column(String(150), nullable=True)
    phone        = Column(String(30), nullable=True)
    email        = Column(String(255), nullable=True)
    is_active    = Column(Boolean, default=True)
    is_archived  = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    material_links = relationship("VendorMaterial", back_populates="vendor", cascade="all, delete-orphan")


class VendorMaterial(Base):
    """Sourcing terms: which vendor supplies which material, per-plant lead time, MOQ, cost."""
    __tablename__ = "vendor_materials"

    id               = Column(Integer, primary_key=True, index=True)
    vendor_id        = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    material_id      = Column(Integer, ForeignKey("raw_materials.id"), nullable=False)
    plant_id         = Column(Integer, ForeignKey("plants.id"), nullable=True)   # null = applies to all plants
    lead_time_days   = Column(Integer, default=7)
    safety_stock_days = Column(Integer, default=3)
    min_order_qty    = Column(Float, default=0.0)
    unit_cost        = Column(Float, default=0.0)
    is_archived      = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=datetime.utcnow)

    vendor   = relationship("Vendor", back_populates="material_links")
    material = relationship("RawMaterial", back_populates="vendor_links")
    plant    = relationship("Plant")


class BillOfMaterials(Base):
    """Recipe: raw material consumed per finished unit of an SKU."""
    __tablename__ = "bill_of_materials"

    id            = Column(Integer, primary_key=True, index=True)
    sku_id        = Column(Integer, ForeignKey("skus.id"), nullable=False)
    material_id   = Column(Integer, ForeignKey("raw_materials.id"), nullable=False)
    qty_per_unit  = Column(Float, default=0.0)
    created_at    = Column(DateTime, default=datetime.utcnow)

    sku      = relationship("SKU", back_populates="bom_items")
    material = relationship("RawMaterial", back_populates="bom_items")


class RawMaterialStock(Base):
    """Current raw-material stock per plant + reorder parameters (Phase 1 fills logic)."""
    __tablename__ = "raw_material_stocks"

    id               = Column(Integer, primary_key=True, index=True)
    plant_id         = Column(Integer, ForeignKey("plants.id"), nullable=False)
    material_id      = Column(Integer, ForeignKey("raw_materials.id"), nullable=False)
    quantity         = Column(Float, default=0.0)
    avg_daily_usage  = Column(Float, default=0.0)
    safety_stock     = Column(Float, default=0.0)
    reorder_point    = Column(Float, default=0.0)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plant    = relationship("Plant", back_populates="rm_stocks")
    material = relationship("RawMaterial", back_populates="stocks")


# ─── STOCK MOVEMENT LEDGER (daily, FG + RM) ──────────────────────────────────

class StockEntity(str, enum.Enum):
    raw_material   = "raw_material"
    finished_good  = "finished_good"


class StockMovement(Base):
    """Daily ledger row: opening -> in -> out -> closing for a material or SKU at a plant."""
    __tablename__ = "stock_movements"

    id          = Column(Integer, primary_key=True, index=True)
    entity      = Column(SAEnum(StockEntity), nullable=False)
    plant_id    = Column(Integer, ForeignKey("plants.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("raw_materials.id"), nullable=True)
    sku_id      = Column(Integer, ForeignKey("skus.id"), nullable=True)
    movement_date = Column(Date, nullable=False)
    opening     = Column(Float, default=0.0)
    qty_in      = Column(Float, default=0.0)   # receipts / produced
    qty_out     = Column(Float, default=0.0)   # usage / dispatched
    closing     = Column(Float, default=0.0)
    reason      = Column(String(100), nullable=True)  # receipt, usage, adjustment, production, dispatch
    note        = Column(Text, nullable=True)
    staff_id    = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    plant    = relationship("Plant")
    material = relationship("RawMaterial")
    sku      = relationship("SKU")


# ─── PURCHASE ORDERS / REORDER TRACKER ───────────────────────────────────────

class POStatus(str, enum.Enum):
    draft    = "draft"
    pending  = "pending"
    ordered  = "ordered"
    arrived  = "arrived"
    cancelled = "cancelled"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id              = Column(Integer, primary_key=True, index=True)
    po_number       = Column(String(30), unique=True, nullable=True)
    plant_id        = Column(Integer, ForeignKey("plants.id"), nullable=False)
    material_id     = Column(Integer, ForeignKey("raw_materials.id"), nullable=False)
    vendor_id       = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    trigger_date    = Column(Date, nullable=True)
    stock_at_trigger = Column(Float, default=0.0)
    reorder_point   = Column(Float, default=0.0)
    order_qty       = Column(Float, default=0.0)
    lead_time_days  = Column(Integer, default=7)
    expected_arrival = Column(Date, nullable=True)
    unit_cost       = Column(Float, default=0.0)
    status          = Column(SAEnum(POStatus), default=POStatus.draft)
    auto_generated  = Column(Boolean, default=False)
    notes           = Column(Text, nullable=True)
    is_archived     = Column(Boolean, default=False)
    created_by      = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plant    = relationship("Plant")
    material = relationship("RawMaterial")
    vendor   = relationship("Vendor")


class ProductionStatus(str, enum.Enum):
    planned   = "planned"
    completed = "completed"
    cancelled = "cancelled"


class ProductionRun(Base):
    """A planned/executed batch: produces FG and (on completion) consumes RM via BOM."""
    __tablename__ = "production_runs"

    id             = Column(Integer, primary_key=True, index=True)
    plant_id       = Column(Integer, ForeignKey("plants.id"), nullable=False)
    sku_id         = Column(Integer, ForeignKey("skus.id"), nullable=False)
    run_date       = Column(Date, nullable=False)
    planned_units  = Column(Float, default=0.0)
    produced_units = Column(Float, default=0.0)
    hours_required = Column(Float, default=0.0)
    status         = Column(SAEnum(ProductionStatus), default=ProductionStatus.planned)
    note           = Column(Text, nullable=True)
    created_by     = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    completed_at   = Column(DateTime, nullable=True)

    plant = relationship("Plant")
    sku   = relationship("SKU")


class MetricSnapshot(Base):
    """Daily KPI snapshot (long format) for real deltas + trend series."""
    __tablename__ = "metric_snapshots"

    id            = Column(Integer, primary_key=True, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    metric        = Column(String(50), nullable=False, index=True)
    value         = Column(Float, default=0.0)


class PlantUtilSnapshot(Base):
    """Daily per-plant utilization snapshot for plant-production trends."""
    __tablename__ = "plant_util_snapshots"

    id            = Column(Integer, primary_key=True, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    plant_id      = Column(Integer, ForeignKey("plants.id"), nullable=False)
    utilization   = Column(Float, default=0.0)


class SalesForecast(Base):
    """Daily expected sales orders per SKU per plant (SALES_FORECAST sheet)."""
    __tablename__ = "sales_forecasts"

    id             = Column(Integer, primary_key=True, index=True)
    plant_id       = Column(Integer, ForeignKey("plants.id"), nullable=False)
    sku_id         = Column(Integer, ForeignKey("skus.id"), nullable=False)
    forecast_date  = Column(Date, nullable=False)
    forecast_units = Column(Float, default=0.0)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plant = relationship("Plant")
    sku   = relationship("SKU")


class SKUPriceHistory(Base):
    __tablename__ = "sku_price_history"

    id             = Column(Integer, primary_key=True, index=True)
    sku_id         = Column(Integer, ForeignKey("skus.id"), nullable=False)
    price          = Column(Float, nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to   = Column(Date, nullable=True)
    updated_by     = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    sku = relationship("SKU", back_populates="price_history")


# ─── ORDERS ──────────────────────────────────────────────────────────────────

class Order(Base):
    __tablename__ = "orders"

    id              = Column(Integer, primary_key=True, index=True)
    order_number    = Column(String(20), unique=True, nullable=False)
    customer_id     = Column(Integer, ForeignKey("customers.id"), nullable=False)
    salesperson_id  = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    status          = Column(SAEnum(OrderStatus), default=OrderStatus.submitted)
    subtotal        = Column(Float, default=0.0)
    total_amount    = Column(Float, default=0.0)
    notes           = Column(Text, nullable=True)
    delivery_address = Column(Text, nullable=True)
    tentative_delivery_date = Column(Date, nullable=True)
    verified_by     = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    verified_at     = Column(DateTime, nullable=True)
    confirmed_by    = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    confirmed_at    = Column(DateTime, nullable=True)
    is_archived     = Column(Boolean, default=False)  # soft delete
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer    = relationship("Customer", back_populates="orders")
    salesperson = relationship("StaffUser", foreign_keys=[salesperson_id])
    items       = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payment     = relationship("Payment", back_populates="order", uselist=False)
    delivery    = relationship("Delivery", back_populates="order", uselist=False)
    grn         = relationship("GRN", back_populates="order", uselist=False)
    proforma    = relationship("ProformaInvoice", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"), nullable=False)
    sku_id     = Column(Integer, ForeignKey("skus.id"), nullable=False)
    quantity   = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal   = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    sku   = relationship("SKU", back_populates="order_items")


# ─── PROFORMA INVOICE ────────────────────────────────────────────────────────

class ProformaInvoice(Base):
    __tablename__ = "proforma_invoices"

    id          = Column(Integer, primary_key=True, index=True)
    order_id    = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    invoice_number = Column(String(30), unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    issued_by   = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    issued_at   = Column(DateTime, default=datetime.utcnow)
    wa_sent     = Column(Boolean, default=False)
    notes       = Column(Text, nullable=True)

    order = relationship("Order", back_populates="proforma")


# ─── PAYMENT ─────────────────────────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"

    id             = Column(Integer, primary_key=True, index=True)
    order_id       = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    method         = Column(SAEnum(PaymentMethod), default=PaymentMethod.bank_transfer)
    amount         = Column(Float, nullable=False)
    proof_file_url = Column(String(500), nullable=True)   # uploaded image path
    proof_filename = Column(String(255), nullable=True)
    status         = Column(SAEnum(PaymentStatus), default=PaymentStatus.pending)
    verified_by    = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    verified_at    = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    uploaded_at    = Column(DateTime, default=datetime.utcnow)

    order            = relationship("Order", back_populates="payment")
    verified_by_user = relationship("StaffUser", back_populates="verified_payments", foreign_keys=[verified_by])


# ─── DELIVERY ────────────────────────────────────────────────────────────────

class Delivery(Base):
    __tablename__ = "deliveries"

    id               = Column(Integer, primary_key=True, index=True)
    order_id         = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    tracking_number  = Column(String(100), nullable=True)
    carrier          = Column(String(100), nullable=True)
    shipped_at       = Column(DateTime, nullable=True)
    shipped_by       = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    delivered_at     = Column(DateTime, nullable=True)
    delivered_by     = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    pod_file_url     = Column(String(500), nullable=True)   # proof of delivery
    notes            = Column(Text, nullable=True)

    order = relationship("Order", back_populates="delivery")


# ─── GRN (GOODS RECEIPT NOTE) ────────────────────────────────────────────────

class GRN(Base):
    __tablename__ = "grns"

    id               = Column(Integer, primary_key=True, index=True)
    order_id         = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True)
    received_qty     = Column(Float, nullable=True)
    condition_notes  = Column(Text, nullable=True)
    is_accepted      = Column(Boolean, default=True)
    image_url        = Column(String(500), nullable=True)
    image_filename   = Column(String(255), nullable=True)
    submitted_at     = Column(DateTime, nullable=True)
    logged_by        = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="grn")


# ─── WHATSAPP MESSAGE LOG ────────────────────────────────────────────────────

class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id           = Column(Integer, primary_key=True, index=True)
    customer_id  = Column(Integer, ForeignKey("customers.id"), nullable=True)
    phone_number = Column(String(30), nullable=False)
    direction    = Column(SAEnum(WaDirection), nullable=False)
    message_type = Column(String(50), default="text")   # text, otp, proforma, confirmation, etc.
    content      = Column(Text, nullable=False)
    order_id     = Column(Integer, ForeignKey("orders.id"), nullable=True)
    status       = Column(String(20), default="sent")   # sent, delivered, failed
    sent_at      = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="wa_messages")


# ─── AUDIT LOG ───────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)   # order, customer, payment, sku
    entity_id   = Column(Integer, nullable=False)
    action      = Column(String(100), nullable=False)  # status_change, approved, rejected, etc.
    old_value   = Column(Text, nullable=True)
    new_value   = Column(Text, nullable=True)
    note        = Column(Text, nullable=True)
    staff_id    = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    staff_name  = Column(String(200), nullable=True)   # denormalised for display
    created_at  = Column(DateTime, default=datetime.utcnow)


# ─── ORDER NOTES (staff-only) ────────────────────────────────────────────────

class OrderNote(Base):
    __tablename__ = "order_notes"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"), nullable=False)
    staff_id   = Column(Integer, ForeignKey("staff_users.id"), nullable=False)
    staff_name = Column(String(200), nullable=True)
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", backref="notes_list")
