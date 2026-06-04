"""Audit log — read-only endpoint for admin."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.staff_auth import require_role

router = APIRouter(tags=["audit"])


@router.get("/admin/audit")
def get_audit_log(
    entity_type: str | None = None,
    entity_id: int | None = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(require_role("admin", "central_team")),
):
    q = db.query(models.AuditLog)
    if entity_type:
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(models.AuditLog.entity_id == entity_id)
    logs = q.order_by(models.AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id":          l.id,
            "entity_type": l.entity_type,
            "entity_id":   l.entity_id,
            "action":      l.action,
            "old_value":   l.old_value,
            "new_value":   l.new_value,
            "note":        l.note,
            "staff_name":  l.staff_name,
            "created_at":  l.created_at.isoformat(),
        }
        for l in logs
    ]
