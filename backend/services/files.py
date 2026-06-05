import os
import uuid
from fastapi import UploadFile, HTTPException

UPLOAD_DIR   = os.environ.get("UPLOAD_DIR", "../uploads")
MAX_MB       = int(os.environ.get("MAX_UPLOAD_MB", 10))
ALLOWED_EXTS = {".png", ".jpg", ".jpeg"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg"}


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


async def save_payment_proof(file: UploadFile, order_number: str) -> tuple[str, str]:
    """Save uploaded payment proof. Returns (file_url, filename)."""
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and JPEG images are accepted.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only .png, .jpg, .jpeg files are accepted.")

    contents = await file.read()
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_MB}MB.")

    save_dir = os.path.join(UPLOAD_DIR, "payments")
    _ensure_dir(save_dir)

    unique_name = f"{order_number}_{uuid.uuid4().hex[:8]}{ext}"
    save_path   = os.path.join(save_dir, unique_name)

    with open(save_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/payments/{unique_name}"
    return file_url, unique_name


async def save_grn_image(file: UploadFile, order_number: str) -> tuple[str, str]:
    """Save GRN delivery photo. Returns (file_url, filename)."""
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and JPEG images are accepted.")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only .png, .jpg, .jpeg files are accepted.")
    contents = await file.read()
    if len(contents) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_MB}MB.")
    save_dir = os.path.join(UPLOAD_DIR, "grns")
    _ensure_dir(save_dir)
    unique_name = f"grn_{order_number}_{uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(save_dir, unique_name), "wb") as f:
        f.write(contents)
    return f"/uploads/grns/{unique_name}", unique_name
