"""Staff-only internal notes on orders."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
import models
from routers.staff_auth import get_current_staff

router = APIRouter(tags=["notes"])


class NoteIn(BaseModel):
    content: str


class NoteOut(BaseModel):
    id: int
    order_id: int
    staff_id: int
    staff_name: str | None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/staff/orders/{order_id}/notes", response_model=list[NoteOut])
def get_notes(
    order_id: int,
    db: Session = Depends(get_db),
    _: models.StaffUser = Depends(get_current_staff),
):
    return db.query(models.OrderNote).filter(
        models.OrderNote.order_id == order_id
    ).order_by(models.OrderNote.created_at.asc()).all()


@router.post("/staff/orders/{order_id}/notes", response_model=NoteOut, status_code=201)
def add_note(
    order_id: int,
    payload: NoteIn,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(get_current_staff),
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    note = models.OrderNote(
        order_id=order_id,
        staff_id=staff.id,
        staff_name=staff.name,
        content=payload.content.strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/staff/orders/{order_id}/notes/{note_id}", status_code=204)
def delete_note(
    order_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    staff: models.StaffUser = Depends(get_current_staff),
):
    note = db.query(models.OrderNote).filter(
        models.OrderNote.id == note_id,
        models.OrderNote.order_id == order_id,
        models.OrderNote.staff_id == staff.id,  # can only delete own notes
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or not yours")
    db.delete(note)
    db.commit()
