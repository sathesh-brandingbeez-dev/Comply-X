# calendar_api.py
from __future__ import annotations

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import (
    CalendarEvent, EventAttendee, EventReminder,
    EventTypeEnum, PriorityEnum, EventStatusEnum, ReminderMethodEnum,
    User,
)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# ---------- Pydantic Schemas to match EventSheet payload ----------

class AttendeeIn(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    required: bool = True

class ReminderIn(BaseModel):
    minutes_before: int
    method: str = "Email"           # EventSheet uses "Email"
    custom_message: Optional[str] = None

class EventUpsertIn(BaseModel):
    id: Optional[str] = None
    title: str
    type: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    department_ids: Optional[List[int]] = []
    priority: str
    status: str
    all_day: bool
    start_at: str                   # ISO
    end_at: str                     # ISO
    tz: Optional[str] = "UTC"
    attendees: Optional[List[AttendeeIn]] = []
    reminders: Optional[List[ReminderIn]] = []

# util: robust ISO parser (handles trailing Z)
def _parse_iso(dt: str) -> datetime:
    if dt.endswith("Z"):
        dt = dt[:-1] + "+00:00"
    return datetime.fromisoformat(dt)

def _coerce_enum(name: str, value: str):
    # map string from UI to Enum (raises for bad values)
    mapping = {
        "type": EventTypeEnum,
        "priority": PriorityEnum,
        "status": EventStatusEnum,
        "reminder_method": ReminderMethodEnum,
    }
    enum_cls = mapping[name]
    try:
        # UI passes the human label that equals enum value, e.g. "Meeting"
        return enum_cls(value)
    except Exception:
        # Try by name as fallback (e.g., "MEETING")
        try:
            return enum_cls[value]
        except Exception:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid {name}: {value}. Allowed: {[e.value for e in enum_cls]}",
            )

# ---------- Routes ----------

@router.get("/events")
def list_events(db: Session = Depends(get_db)):
    q = db.query(CalendarEvent).order_by(CalendarEvent.start_at.desc())
    items = []
    for ev in q.all():
        items.append({
            "id": ev.id,
            "title": ev.title,
            "type": ev.type.value,
            "description": ev.description or "",
            "location": ev.location or "",
            "department_ids": ev.department_ids or [],
            "priority": ev.priority.value,
            "status": ev.status.value,
            "all_day": bool(ev.all_day),
            "start_at": ev.start_at.isoformat() if ev.start_at else None,
            "end_at": ev.end_at.isoformat() if ev.end_at else None,
            "time_zone": ev.tz,
            "attendees_required": [a.email for a in ev.attendees if a.required and a.email],
            "attendees_optional": [a.email for a in ev.attendees if not a.required and a.email],
            "reminders": [r.minutes_before for r in ev.reminders],
        })
    return {"items": items}

@router.post("/events", status_code=status.HTTP_201_CREATED)
def create_event(payload: EventUpsertIn, db: Session = Depends(get_db)):
    # pick an organizer: first user in DB (bootstrap friendly)
    organizer = db.query(User).first()
    if organizer is None:
        raise HTTPException(400, "No users found. Run init_db to seed a user first.")

    start_dt = _parse_iso(payload.start_at)
    end_dt = _parse_iso(payload.end_at)

    ev = CalendarEvent(
        title=payload.title.strip(),
        description=(payload.description or "").strip(),
        location=(payload.location or "").strip(),
        type=_coerce_enum("type", payload.type),
        priority=_coerce_enum("priority", payload.priority),
        status=_coerce_enum("status", payload.status),
        all_day=bool(payload.all_day),
        tz=payload.tz or "UTC",
        start_at=start_dt,
        end_at=end_dt,
        # also fill legacy naive fields to keep model happy
        start=start_dt.replace(tzinfo=None),
        end=end_dt.replace(tzinfo=None),
        organizer_id=organizer.id,
        department_ids=payload.department_ids or [],
    )
    db.add(ev)
    db.flush()  # to get ev.id

    # attendees
    for a in (payload.attendees or []):
        db.add(EventAttendee(
            event_id=ev.id,
            user_id=a.user_id,
            email=a.email,
            required=bool(a.required),
        ))

    # reminders
    for r in (payload.reminders or []):
        db.add(EventReminder(
            event_id=ev.id,
            minutes_before=int(r.minutes_before),
            method=_coerce_enum("reminder_method", r.method),
            custom_message=r.custom_message,
        ))

    db.commit()
    return {"ok": True, "id": ev.id}

@router.put("/events/{event_id}")
def update_event(event_id: str, payload: EventUpsertIn, db: Session = Depends(get_db)):
    ev = db.query(CalendarEvent).get(int(event_id))
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    start_dt = _parse_iso(payload.start_at)
    end_dt = _parse_iso(payload.end_at)

    ev.title = payload.title.strip()
    ev.description = (payload.description or "").strip()
    ev.location = (payload.location or "").strip()
    ev.type = _coerce_enum("type", payload.type)
    ev.priority = _coerce_enum("priority", payload.priority)
    ev.status = _coerce_enum("status", payload.status)
    ev.all_day = bool(payload.all_day)
    ev.tz = payload.tz or "UTC"
    ev.start_at = start_dt
    ev.end_at = end_dt
    ev.start = start_dt.replace(tzinfo=None)
    ev.end = end_dt.replace(tzinfo=None)
    ev.department_ids = payload.department_ids or []

    # replace attendees/reminders (simple approach)
    ev.attendees.clear()
    ev.reminders.clear()
    db.flush()

    for a in (payload.attendees or []):
        db.add(EventAttendee(
            event_id=ev.id,
            user_id=a.user_id,
            email=a.email,
            required=bool(a.required),
        ))
    for r in (payload.reminders or []):
        db.add(EventReminder(
            event_id=ev.id,
            minutes_before=int(r.minutes_before),
            method=_coerce_enum("reminder_method", r.method),
            custom_message=r.custom_message,
        ))

    db.commit()
    return {"ok": True, "id": ev.id}

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    ev = db.query(CalendarEvent).get(int(event_id))
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(ev)
    db.commit()
    return
