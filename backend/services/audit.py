"""Utility to write audit log entries."""
from datetime import datetime
from sqlalchemy.orm import Session
import models


def log(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    staff: models.StaffUser | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    note: str | None = None,
):
    entry = models.AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        note=note,
        staff_id=staff.id if staff else None,
        staff_name=staff.name if staff else None,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    # Caller is responsible for db.commit()
