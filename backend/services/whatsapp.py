import os
import requests
import logging

logger = logging.getLogger(__name__)

WA_URL    = os.environ.get("WHATSAPP_SERVICE_URL", "http://localhost:8003")
WA_KEY    = os.environ.get("WHATSAPP_API_KEY", "def_mobile_wa_secret")
HEADERS   = {"Authorization": f"Bearer {WA_KEY}", "Content-Type": "application/json"}


def _chat_id(phone: str) -> str:
    """Convert phone number to WhatsApp chatId format."""
    digits = "".join(c for c in phone if c.isdigit())
    return f"{digits}@c.us"


def _send(phone: str, text: str) -> bool:
    try:
        r = requests.post(
            f"{WA_URL}/api/sendText",
            json={"chatId": _chat_id(phone), "text": text},
            headers=HEADERS,
            timeout=10,
        )
        return r.status_code == 200
    except Exception as e:
        logger.warning(f"[WA] Send failed to {phone}: {e}")
        return False


def send_otp(phone: str, otp: str, name: str = "") -> bool:
    greeting = f"Hi {name}! " if name else ""
    text = (
        f"🔐 *DEF Platform — Verification Code*\n\n"
        f"{greeting}Your one-time code is:\n\n"
        f"*{otp}*\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone."
    )
    return _send(phone, text)


def send_registration_pending(phone: str, name: str) -> bool:
    text = (
        f"👋 Hi *{name}*,\n\n"
        f"Your registration has been received and is pending approval by our team.\n\n"
        f"We'll notify you via WhatsApp once your account is activated. "
        f"This usually takes less than 24 hours."
    )
    return _send(phone, text)


def send_registration_approved(phone: str, name: str) -> bool:
    text = (
        f"✅ *Account Approved!*\n\n"
        f"Hi *{name}*, your DEF Platform account has been approved.\n\n"
        f"You can now log in and place orders."
    )
    return _send(phone, text)


def send_registration_rejected(phone: str, name: str, reason: str = "") -> bool:
    text = (
        f"Hi *{name}*,\n\n"
        f"Unfortunately your registration could not be approved at this time."
        + (f"\n\nReason: {reason}" if reason else "")
        + f"\n\nPlease contact our team for more information."
    )
    return _send(phone, text)


def send_order_received(phone: str, name: str, order_number: str) -> bool:
    text = (
        f"📋 *Order Received*\n\n"
        f"Hi *{name}*, we've received your order *#{order_number}*.\n\n"
        f"Our team will review and verify your order shortly. "
        f"You'll receive a proforma invoice once verified."
    )
    return _send(phone, text)


def send_proforma_invoice(phone: str, name: str, order_number: str, items: list, total: float, notes: str = "") -> bool:
    lines = "\n".join(
        f"  • {i['name']} × {int(i['quantity'])} @ ${i['unit_price']:.2f} = *${i['subtotal']:.2f}*"
        for i in items
    )
    text = (
        f"🧾 *Proforma Invoice — #{order_number}*\n\n"
        f"Hi *{name}*, please find your proforma invoice below:\n\n"
        f"{lines}\n\n"
        f"{'─' * 28}\n"
        f"*Total: ${total:,.2f}*\n\n"
        f"To confirm this order, please make payment and upload your proof of payment "
        f"via the customer portal or reply to this message with your payment receipt."
        + (f"\n\n📝 Note: {notes}" if notes else "")
    )
    return _send(phone, text)


def send_payment_received(phone: str, name: str, order_number: str) -> bool:
    text = (
        f"💳 *Payment Proof Received*\n\n"
        f"Hi *{name}*, we've received your payment proof for order *#{order_number}*.\n\n"
        f"Our finance team will verify your payment shortly. "
        f"You'll receive an order confirmation once verified."
    )
    return _send(phone, text)


def send_payment_rejected(phone: str, name: str, order_number: str, reason: str = "") -> bool:
    reason_line = f"\n📝 Reason: _{reason}_\n" if reason and reason.strip() else "\n"
    text = (
        f"❌ *Payment Proof Rejected — #{order_number}*\n\n"
        f"Hi *{name}*, unfortunately we could not verify your payment proof for order *#{order_number}*."
        f"{reason_line}\n"
        f"Please log in to the portal and upload a new, clear image of your payment receipt. "
        f"Contact us if you need help."
    )
    return _send(phone, text)


def send_order_confirmation(phone: str, name: str, order_number: str, delivery_date: str = "") -> bool:
    text = (
        f"✅ *Order Confirmed — #{order_number}*\n\n"
        f"Hi *{name}*, your payment has been verified and your order is confirmed!\n\n"
        + (f"📅 Tentative delivery date: *{delivery_date}*\n\n" if delivery_date else "")
        + f"Our operations team will be in touch with delivery details."
    )
    return _send(phone, text)


def send_order_shipped(phone: str, name: str, order_number: str, tracking: str = "", carrier: str = "") -> bool:
    text = (
        f"🚚 *Your Order Is On Its Way!*\n\n"
        f"Hi *{name}*, order *#{order_number}* has been dispatched.\n\n"
        + (f"Carrier: *{carrier}*\n" if carrier else "")
        + (f"Tracking: *{tracking}*\n\n" if tracking else "\n")
        + f"You'll receive another message when your order is delivered."
    )
    return _send(phone, text)


def send_order_delivered(phone: str, name: str, order_number: str) -> bool:
    text = (
        f"📦 *Order Delivered — #{order_number}*\n\n"
        f"Hi *{name}*, your order has been delivered!\n\n"
        f"Please confirm receipt by filling in the GRN form in your customer portal, "
        f"or reply *CONFIRM {order_number}* to acknowledge receipt."
    )
    return _send(phone, text)


def send_grn_confirmation(phone: str, name: str, order_number: str) -> bool:
    text = (
        f"✅ *GRN Confirmed — #{order_number}*\n\n"
        f"Hi *{name}*, thank you for confirming receipt of your order.\n\n"
        f"Your order is now complete. Thank you for choosing DEF Platform!"
    )
    return _send(phone, text)


def get_status() -> dict:
    try:
        r = requests.get(f"{WA_URL}/api/isConnected", timeout=5)
        return r.json()
    except Exception:
        return {"connected": False, "status": "unreachable"}
