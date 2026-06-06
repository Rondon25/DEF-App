"""
Automated WhatsApp follow-up reminders.

Jobs:
  1. Every 6h — check orders with proforma_sent > 3 days → send payment reminder
  2. Every 6h — check orders with grn_pending > 2 days → send GRN reminder
"""
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

import models
from database import SessionLocal
from services.whatsapp import _send


def _send_payment_reminder(phone: str, name: str, order_number: str, days: int) -> bool:
    text = (
        f"⏰ *Payment Reminder — #{order_number}*\n\n"
        f"Hi *{name}*, your proforma invoice for order *#{order_number}* is still awaiting payment "
        f"({days} day{'s' if days != 1 else ''} ago).\n\n"
        f"Please upload your payment proof via the customer portal to proceed.\n"
        f"Reply *HELP* or contact us if you need assistance."
    )
    return _send(phone, text)


def _send_grn_reminder(phone: str, name: str, order_number: str, days: int) -> bool:
    text = (
        f"📦 *Delivery Confirmation Required — #{order_number}*\n\n"
        f"Hi *{name}*, your order *#{order_number}* was delivered {days} day{'s' if days != 1 else ''} ago.\n\n"
        f"Please confirm receipt via the customer portal so we can close your order.\n"
        f"Reply *HELP* if you have not received your delivery."
    )
    return _send(phone, text)


def check_overdue_payments():
    """Send reminder to customers with proforma_sent > 3 days, max once per day."""
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=3)
        orders = db.query(models.Order).filter(
            models.Order.status == models.OrderStatus.proforma_sent,
            models.Order.verified_at <= cutoff,
        ).all()

        for order in orders:
            customer = order.customer
            if not customer:
                continue
            days_overdue = (datetime.utcnow() - order.verified_at.replace(tzinfo=None)).days
            # Only remind every 3 days to avoid spam
            if days_overdue % 3 == 0:
                _send_payment_reminder(customer.phone_number, customer.name, order.order_number, days_overdue)
                print(f"[Scheduler] Payment reminder sent for {order.order_number}")
    except Exception as e:
        print(f"[Scheduler] Payment reminder error: {e}")
    finally:
        db.close()


def check_overdue_grns():
    """Send GRN reminder to customers with grn_pending > 2 days."""
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=2)
        orders = db.query(models.Order).join(models.Delivery).filter(
            models.Order.status == models.OrderStatus.grn_pending,
            models.Delivery.delivered_at <= cutoff,
        ).all()

        for order in orders:
            customer = order.customer
            if not customer or not order.delivery:
                continue
            delivered_at = order.delivery.delivered_at.replace(tzinfo=None) if order.delivery.delivered_at.tzinfo else order.delivery.delivered_at
            days_since = (datetime.utcnow() - delivered_at).days
            if days_since % 2 == 0:
                _send_grn_reminder(customer.phone_number, customer.name, order.order_number, days_since)
                print(f"[Scheduler] GRN reminder sent for {order.order_number}")
    except Exception as e:
        print(f"[Scheduler] GRN reminder error: {e}")
    finally:
        db.close()


def record_daily_snapshot():
    """Snapshot KPIs + plant utilization once per day for real deltas/trends."""
    db = SessionLocal()
    try:
        from services.metrics import snapshot_day
        snapshot_day(db)
        print("[Scheduler] KPI snapshot recorded")
    except Exception as e:
        print(f"[Scheduler] Snapshot error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_overdue_payments, IntervalTrigger(hours=6), id="payment_reminders", replace_existing=True)
    scheduler.add_job(check_overdue_grns,     IntervalTrigger(hours=6), id="grn_reminders",     replace_existing=True)
    scheduler.add_job(record_daily_snapshot,  IntervalTrigger(hours=12), id="kpi_snapshot",     replace_existing=True)
    scheduler.start()
    print("[Scheduler] ✅ Background jobs started (reminders 6h, KPI snapshot 12h)")
    return scheduler
