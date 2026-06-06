"""Authenticated, signed file serving for uploads (payment proofs, GRN photos).
Files are only reachable via short-lived HMAC-signed URLs minted by the API after
an ownership/role check — no public static directory."""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from services.files import verify_file_sig, resolve_path

router = APIRouter(tags=["files"])


@router.get("/files/{category}/{filename}")
def serve_file(category: str, filename: str, exp: int = Query(...), sig: str = Query(...)):
    rel = f"{category}/{filename}"
    if not verify_file_sig(rel, exp, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired file link")
    path = resolve_path(rel)
    if not path:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
