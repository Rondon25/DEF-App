import os
from datetime import date
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import engine, Base, SessionLocal
import models
from routers import auth, staff_auth, catalog, customers, orders, payments, delivery
from services.whatsapp import get_status as wa_status

# ── Create tables ─────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="DEF Platform Mobile", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving for uploads ──────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "payments"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "grns"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(staff_auth.router)
app.include_router(catalog.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(delivery.router)


# ── Health & WhatsApp status ──────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/whatsapp/status")
def whatsapp_status():
    return wa_status()


# ═════════════════════════════════════════════════════════════════════════════
# SEED DATA
# ═════════════════════════════════════════════════════════════════════════════

def seed_skus():
    db = SessionLocal()
    try:
        if db.query(models.SKU).count() > 0:
            return
        skus = [
            models.SKU(code="DEF-5L",    name="DEF 5L",    description="Diesel Exhaust Fluid — 5 litre container. Suitable for passenger vehicles and light commercial.",    volume_liters=5,    unit="unit",  current_price=6.00),
            models.SKU(code="DEF-10L",   name="DEF 10L",   description="Diesel Exhaust Fluid — 10 litre container. Popular choice for small fleets and workshops.",           volume_liters=10,   unit="unit",  current_price=11.00),
            models.SKU(code="DEF-20L",   name="DEF 20L",   description="Diesel Exhaust Fluid — 20 litre drum. Ideal for medium-duty vehicles and service centres.",           volume_liters=20,   unit="unit",  current_price=19.00),
            models.SKU(code="DEF-200L",  name="DEF 200L",  description="Diesel Exhaust Fluid — 200 litre drum. High-volume option for large fleets and depots.",              volume_liters=200,  unit="drum",  current_price=160.00),
            models.SKU(code="DEF-1000L", name="DEF 1000L", description="Diesel Exhaust Fluid — 1000 litre IBC. Bulk supply for mining, agriculture, and large operations.",   volume_liters=1000, unit="ibc",   current_price=720.00),
            models.SKU(code="DEF-BULK",  name="DEF Bulk",  description="Bulk DEF supply — delivered via tanker. Contact sales for pricing on volumes over 5000 litres.",       volume_liters=0,    unit="litre", current_price=0.52),
        ]
        db.add_all(skus)

        # Add initial price history
        today = date.today()
        for sku in skus:
            db.flush()
            db.add(models.SKUPriceHistory(
                sku_id=sku.id,
                price=sku.current_price,
                effective_from=today,
            ))

        db.commit()
        print("✅ SKUs seeded.")
    except Exception as e:
        db.rollback()
        print(f"[seed_skus] Error: {e}")
    finally:
        db.close()


def seed_staff():
    db = SessionLocal()
    try:
        if db.query(models.StaffUser).count() > 0:
            return
        from services.auth import hash_password
        staff = [
            models.StaffUser(name="Admin User",       email="admin@def.com",      phone_number="61400000001", hashed_password=hash_password("admin123"),      role=models.StaffRole.admin),
            models.StaffUser(name="Central Team",     email="central@def.com",    phone_number="61400000002", hashed_password=hash_password("central123"),    role=models.StaffRole.central_team),
            models.StaffUser(name="Finance Team",     email="finance@def.com",    phone_number="61400000003", hashed_password=hash_password("finance123"),    role=models.StaffRole.finance),
            models.StaffUser(name="Sales Rep",        email="sales@def.com",      phone_number="61400000004", hashed_password=hash_password("sales123"),      role=models.StaffRole.sales),
            models.StaffUser(name="Operations Team",  email="ops@def.com",        phone_number="61400000005", hashed_password=hash_password("ops123"),        role=models.StaffRole.operations),
        ]
        db.add_all(staff)
        db.commit()
        print("✅ Staff users seeded.")
        print("   admin@def.com / admin123")
        print("   central@def.com / central123")
        print("   finance@def.com / finance123")
        print("   sales@def.com / sales123")
        print("   ops@def.com / ops123")
    except Exception as e:
        db.rollback()
        print(f"[seed_staff] Error: {e}")
    finally:
        db.close()


seed_skus()
seed_staff()
