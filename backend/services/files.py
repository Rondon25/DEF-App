import os
import uuid
import hmac
import hashlib
import time
from urllib.parse import quote
from fastapi import UploadFile, HTTPException

from services.auth import SECRET_KEY

UPLOAD_DIR   = os.environ.get("UPLOAD_DIR", "../uploads")
MAX_MB       = int(os.environ.get("MAX_UPLOAD_MB", 10))
ALLOWED_EXTS = {".png", ".jpg", ".jpeg"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg"}
SIGNED_TTL   = int(os.environ.get("FILE_URL_TTL", 3600))  # signed URL lifetime (sec)

# magic-byte signatures so we don't trust the client's content-type / extension
_MAGIC = (b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff")  # PNG, JPEG


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def _validate(file: UploadFile, contents: bytes) -> str:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and JPEG images are accepted.")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only .png, .jpg, .jpeg files are accepted.")
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_MB}MB.")
    if not any(contents.startswith(sig) for sig in _MAGIC):
        raise HTTPException(status_code=400, detail="File is not a valid PNG or JPEG image.")
    return ext


async def _save(file: UploadFile, category: str, prefix: str) -> tuple[str, str]:
    contents = await file.read()
    ext = _validate(file, contents)
    save_dir = os.path.join(UPLOAD_DIR, category)
    _ensure_dir(save_dir)
    # random, non-guessable filename — no order number leaked into the path
    unique_name = f"{prefix}_{uuid.uuid4().hex}{ext}"
    with open(os.path.join(save_dir, unique_name), "wb") as f:
        f.write(contents)
    # stored value is the relative path; URLs are signed at response time
    return f"{category}/{unique_name}", unique_name


async def save_payment_proof(file: UploadFile, order_number: str) -> tuple[str, str]:
    return await _save(file, "payments", "pay")


async def save_grn_image(file: UploadFile, order_number: str) -> tuple[str, str]:
    return await _save(file, "grns", "grn")


# ── Signed, expiring URLs ─────────────────────────────────────────────────────

def _rel(stored: str) -> str:
    """Normalize a stored path to 'category/filename' (handles legacy /uploads/...)."""
    p = (stored or "").lstrip("/")
    if p.startswith("uploads/"):
        p = p[len("uploads/"):]
    return p


def sign_file_url(stored: str | None) -> str | None:
    """Return a short-lived signed URL for a stored upload path."""
    if not stored:
        return None
    rel = _rel(stored)
    exp = int(time.time()) + SIGNED_TTL
    sig = hmac.new(SECRET_KEY.encode(), f"{rel}:{exp}".encode(), hashlib.sha256).hexdigest()
    return f"/files/{quote(rel)}?exp={exp}&sig={sig}"


def verify_file_sig(rel: str, exp: int, sig: str) -> bool:
    if exp < int(time.time()):
        return False
    expected = hmac.new(SECRET_KEY.encode(), f"{_rel(rel)}:{exp}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


def resolve_path(rel: str) -> str | None:
    """Map a verified rel path to an on-disk file, guarding against traversal."""
    rel = _rel(rel)
    if ".." in rel or rel.startswith("/") or "\\" in rel:
        return None
    full = os.path.normpath(os.path.join(UPLOAD_DIR, rel))
    base = os.path.normpath(UPLOAD_DIR)
    if not full.startswith(base):
        return None
    return full if os.path.isfile(full) else None
