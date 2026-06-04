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
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    price_history = relationship("SKUPriceHistory", back_populates="sku")
    order_items   = relationship("OrderItem", back_populates="sku")


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
