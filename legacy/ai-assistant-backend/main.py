"""
main.py - FastAPI application for TicketAI.
Provides RESTful APIs for events discovery, college technical events, workshops,
museums, bookings with seat-hold lifecycle, cryptographically signed QR ticketing,
organizer participant management, wishlist, reviews, certificates, and AI assistant.
"""
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Header, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
from qr_engine import (
    create_ticket_token,
    generate_qr_bytes,
    generate_qr_data_url,
    verify_ticket_token,
)

app = FastAPI(title="TicketAI Backend API", version="2.0.0")

# Enable CORS for the frontend Vite server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database and seeds
db.init_db()

# ----------------- Models -----------------
class LoginIn(BaseModel):
    email: str
    password: str

class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "user"
    college: Optional[str] = ""

class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None
    college: Optional[str] = None

class ForgotPasswordIn(BaseModel):
    email: str

class ResetPasswordIn(BaseModel):
    token: str
    password: str

class CreateEventIn(BaseModel):
    title: str
    category: str
    event_type: Optional[str] = ""
    college: Optional[str] = ""
    branch: Optional[str] = "All Branches"
    city: str
    venue: str
    date: str
    price: float = 0
    capacity: int = 100
    description: Optional[str] = ""
    instructor: Optional[str] = ""
    duration: Optional[str] = ""
    topics: Optional[List[str]] = []
    certificate_available: Optional[int] = 0
    opening_hours: Optional[str] = ""
    visitor_info: Optional[List[str]] = []
    rules_url: Optional[str] = ""
    team_size: Optional[str] = "1"
    poster_url: Optional[str] = ""
    cancellation_policy: Optional[str] = "Free cancellation up to 24 hours before the event"

class CreateBookingIn(BaseModel):
    eventId: str
    qty: int = 1
    teamName: Optional[str] = ""
    attendees: Optional[List[str]] = []
    idempotencyKey: Optional[str] = None

class ScanVerifyIn(BaseModel):
    token: str
    eventId: Optional[str] = None

class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str

class AIChatIn(BaseModel):
    message: str
    language: Optional[str] = "English"

# ----------------- Helper Functions -----------------
def get_user_from_token(authorization: Optional[str] = None):
    if not authorization:
        return None
    # For demo/simple auth: token is user_id or base64
    tok = authorization.replace("Bearer ", "").strip()
    with db.get_conn() as c:
        row = c.execute("SELECT * FROM users WHERE id = ?", (tok,)).fetchone()
        if row:
            d = dict(row)
            d.pop("password", None)
            return d
    return None

def row_to_event(row):
    d = dict(row)
    try:
        d["topics"] = json.loads(d.get("topics") or "[]")
    except Exception:
        d["topics"] = []
    try:
        d["visitor_info"] = json.loads(d.get("visitor_info") or "[]")
    except Exception:
        d["visitor_info"] = []
    d["certificate_available"] = bool(d.get("certificate_available"))
    return d

def row_to_booking(row):
    d = dict(row)
    try:
        d["attendees"] = json.loads(d.get("attendees") or "[]")
    except Exception:
        d["attendees"] = []
    d["reminder_set"] = bool(d.get("reminder_set"))
    return d

def sweep_expired_holds():
    now_ms = int(time.time() * 1000)
    with db.get_conn() as c:
        c.execute("""
            UPDATE bookings SET status = 'EXPIRED'
            WHERE status = 'HELD' AND hold_expires_at < ?
        """, (now_ms,))

# ----------------- Auth Endpoints -----------------
@app.post("/auth/login")
def login(body: LoginIn):
    with db.get_conn() as c:
        row = c.execute("SELECT * FROM users WHERE lower(email) = ?", (body.email.strip().lower(),)).fetchone()
        if not row or row["password"] != body.password:
            raise HTTPException(status_code=400, detail="Wrong email or password")
        u = dict(row)
        u.pop("password", None)
        return {"user": u, "token": u["id"]}

@app.post("/auth/register")
def register(body: RegisterIn):
    email = body.email.strip().lower()
    with db.get_conn() as c:
        existing = c.execute("SELECT id FROM users WHERE lower(email) = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already registered")
        user_id = f"u_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        role = body.role if body.role in ["user", "vendor", "organizer"] else "user"
        c.execute("""
            INSERT INTO users (id, name, email, password, role, college, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (user_id, body.name.strip(), email, body.password, role, body.college or "", now_iso))
        
        user_row = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        u = dict(user_row)
        u.pop("password", None)
        return {"user": u, "token": user_id}

@app.put("/auth/me")
def update_profile(body: UpdateProfileIn, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    with db.get_conn() as c:
        fields = []
        vals = []
        if body.name is not None:
            fields.append("name = ?"); vals.append(body.name)
        if body.phone is not None:
            fields.append("phone = ?"); vals.append(body.phone)
        if body.language is not None:
            fields.append("language = ?"); vals.append(body.language)
        if body.college is not None:
            fields.append("college = ?"); vals.append(body.college)
            
        if fields:
            vals.append(user["id"])
            c.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", tuple(vals))
            
        row = c.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        u = dict(row)
        u.pop("password", None)
        return u

@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordIn):
    return {"message": "If this email exists, a reset link has been sent.", "demoToken": "reset-token-valid"}

@app.post("/auth/reset-password")
def reset_password(body: ResetPasswordIn):
    return {"message": "Password updated successfully"}

# ----------------- Events Endpoints -----------------
@app.get("/events")
def list_events(
    q: str = "",
    category: str = "All",
    event_type: str = "All",
    college: str = "All",
    branch: str = "All",
    city: str = "All",
    price: str = "any",
    days: str = "all",
    has_certificate: Optional[bool] = None,
    free_only: Optional[bool] = None,
    sort: Optional[str] = None
):
    with db.get_conn() as c:
        query = "SELECT * FROM events WHERE 1=1"
        params = []

        if category != "All":
            query += " AND category = ?"
            params.append(category)

        if event_type != "All":
            query += " AND event_type = ?"
            params.append(event_type)

        if college != "All":
            query += " AND college = ?"
            params.append(college)

        if branch != "All":
            query += " AND (branch = 'All Branches' OR branch LIKE ?)"
            params.append(f"%{branch}%")

        if city != "All":
            query += " AND city = ?"
            params.append(city)

        if free_only or price == "0":
            query += " AND price = 0"
        elif price != "any":
            parts = price.split("-")
            if len(parts) == 2:
                lo, hi = parts
                if lo:
                    query += " AND price >= ?"
                    params.append(float(lo))
                if hi:
                    query += " AND price <= ?"
                    params.append(float(hi))

        if has_certificate:
            query += " AND certificate_available = 1"

        if q.strip():
            term = f"%{q.strip().lower()}%"
            query += """ AND (
                lower(title) LIKE ? OR 
                lower(category) LIKE ? OR 
                lower(event_type) LIKE ? OR 
                lower(venue) LIKE ? OR 
                lower(city) LIKE ? OR 
                lower(college) LIKE ? OR 
                lower(instructor) LIKE ?
            )"""
            params.extend([term]*7)

        if sort == "price_asc":
            query += " ORDER BY price ASC"
        elif sort == "price_desc":
            query += " ORDER BY price DESC"
        else:
            query += " ORDER BY date ASC"

        rows = c.execute(query, params).fetchall()
        events = [row_to_event(r) for r in rows]

        # Filter by days limit in Python if needed
        if days != "all":
            limit_ms = (time.time() + float(days) * 86400) * 1000
            events = [e for e in events if datetime.fromisoformat(e["date"]).timestamp() * 1000 <= limit_ms]

        return events

@app.get("/events/cities")
def list_cities():
    with db.get_conn() as c:
        rows = c.execute("SELECT DISTINCT city FROM events WHERE city != '' ORDER BY city").fetchall()
        return [r["city"] for r in rows]

@app.get("/events/colleges")
def list_colleges():
    with db.get_conn() as c:
        rows = c.execute("SELECT DISTINCT college FROM events WHERE college != '' ORDER BY college").fetchall()
        return [r["college"] for r in rows]

@app.get("/events/types")
def list_event_types():
    with db.get_conn() as c:
        rows = c.execute("SELECT DISTINCT event_type FROM events WHERE event_type != '' ORDER BY event_type").fetchall()
        return [r["event_type"] for r in rows]

@app.get("/events/{event_id}")
def get_event(event_id: str):
    with db.get_conn() as c:
        row = c.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Event not found")
        return row_to_event(row)

@app.get("/events/{event_id}/availability")
def get_availability(event_id: str):
    sweep_expired_holds()
    with db.get_conn() as c:
        event = c.execute("SELECT capacity FROM events WHERE id = ?", (event_id,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        used = c.execute("""
            SELECT COALESCE(SUM(qty), 0) as total FROM bookings
            WHERE event_id = ? AND status IN ('HELD', 'CONFIRMED')
        """, (event_id,)).fetchone()["total"]
        seats_left = max(0, event["capacity"] - used)
        return {"seatsLeft": seats_left, "capacity": event["capacity"], "booked": used}

# ----------------- Reviews Endpoints -----------------
@app.get("/events/{event_id}/reviews")
def get_event_reviews(event_id: str):
    with db.get_conn() as c:
        rows = c.execute("SELECT * FROM reviews WHERE event_id = ? ORDER BY created_at DESC", (event_id,)).fetchall()
        reviews = [dict(r) for r in rows]
        avg = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0.0
        return {"reviews": reviews, "average": round(avg, 1), "count": len(reviews)}

@app.post("/events/{event_id}/reviews")
def add_review(event_id: str, body: ReviewIn, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to submit a review")
    with db.get_conn() as c:
        rev_id = f"rev_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        c.execute("""
            INSERT INTO reviews (id, event_id, user_id, user_name, rating, comment, created_at)
            VALUES (?,?,?,?,?,?,?)
        """, (rev_id, event_id, user["id"], user["name"], body.rating, body.comment.strip(), now_iso))
        return {"id": rev_id, "rating": body.rating, "comment": body.comment, "user_name": user["name"]}

# ----------------- Bookings Endpoints -----------------
@app.post("/bookings")
def create_booking(body: CreateBookingIn, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to hold tickets")

    sweep_expired_holds()
    with db.get_conn() as c:
        # Duplicate / Idempotency check
        if body.idempotencyKey:
            dup = c.execute("SELECT * FROM bookings WHERE idempotency_key = ?", (body.idempotencyKey,)).fetchone()
            if dup:
                return row_to_booking(dup)

        # Existing held booking check for same user & event
        existing_held = c.execute("""
            SELECT * FROM bookings WHERE user_id = ? AND event_id = ? AND status = 'HELD'
        """, (user["id"], body.eventId)).fetchone()
        if existing_held:
            return row_to_booking(existing_held)

        event = c.execute("SELECT * FROM events WHERE id = ?", (body.eventId,)).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Capacity check
        used = c.execute("""
            SELECT COALESCE(SUM(qty), 0) as total FROM bookings
            WHERE event_id = ? AND status IN ('HELD', 'CONFIRMED')
        """, (body.eventId,)).fetchone()["total"]
        seats_left = max(0, event["capacity"] - used)

        if body.qty < 1:
            raise HTTPException(status_code=400, detail="Choose at least 1 ticket")
        if body.qty > seats_left:
            raise HTTPException(status_code=400, detail="Sold out" if seats_left == 0 else f"Only {seats_left} tickets left")

        booking_id = f"BK_{uuid.uuid4().hex[:8].upper()}"
        now_ms = int(time.time() * 1000)
        hold_expires_at = now_ms + 10 * 60 * 1000  # 10 minutes hold
        total_amount = body.qty * float(event["price"])

        c.execute("""
            INSERT INTO bookings (
                id, event_id, event_title, event_date, venue, user_id, user_name, user_email,
                qty, team_name, attendees, amount, status, hold_expires_at, cancellation_policy,
                idempotency_key, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            booking_id, event["id"], event["title"], event["date"], event["venue"],
            user["id"], user["name"], user["email"], body.qty, body.teamName or "",
            json.dumps(body.attendees or []), total_amount, "HELD", hold_expires_at,
            event["cancellation_policy"], body.idempotencyKey or "", now_ms
        ))

        b_row = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        return row_to_booking(b_row)

@app.post("/bookings/{booking_id}/pay")
def pay_booking(booking_id: str, authorization: Optional[str] = Header(None)):
    sweep_expired_holds()
    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        if b["status"] == "EXPIRED":
            raise HTTPException(status_code=400, detail="Your hold expired. Please book again.")
        if b["status"] != "HELD":
            raise HTTPException(status_code=400, detail=f"Booking cannot be paid (Status: {b['status']})")

        ticket_code = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        payment_ref = f"pay_{uuid.uuid4().hex[:8]}"

        c.execute("""
            UPDATE bookings SET status = 'CONFIRMED', ticket_code = ?, payment_ref = ?
            WHERE id = ?
        """, (ticket_code, payment_ref, booking_id))

        # Check if event has certificate and auto-generate certificate record
        ev = c.execute("SELECT * FROM events WHERE id = ?", (b["event_id"],)).fetchone()
        if ev and ev["certificate_available"]:
            cert_no = f"CERT-{uuid.uuid4().hex[:8].upper()}"
            now_iso = datetime.now(timezone.utc).strftime("%d %b %Y")
            c.execute("""
                INSERT OR IGNORE INTO certificates (id, booking_id, event_id, event_title, user_id, user_name, certificate_no, issued_date)
                VALUES (?,?,?,?,?,?,?,?)
            """, (f"cert_{uuid.uuid4().hex[:8]}", booking_id, ev["id"], ev["title"], b["user_id"], b["user_name"], cert_no, now_iso))

        updated = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        return row_to_booking(updated)

@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, authorization: Optional[str] = Header(None)):
    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        now_ms = int(time.time() * 1000)
        new_status = "REFUNDED" if b["status"] == "CONFIRMED" else "CANCELLED"
        c.execute("""
            UPDATE bookings SET status = ?, cancelled_at = ?
            WHERE id = ?
        """, (new_status, now_ms, booking_id))
        
        updated = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        return row_to_booking(updated)

@app.get("/bookings/{booking_id}")
def get_booking_details(booking_id: str):
    sweep_expired_holds()
    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        return row_to_booking(b)

@app.get("/bookings/mine")
def list_my_bookings(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    sweep_expired_holds()
    with db.get_conn() as c:
        rows = c.execute("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
        return [row_to_booking(r) for r in rows]

# ----------------- QR Code & Real-Time Verification -----------------
@app.get("/bookings/{booking_id}/qr")
def get_booking_qr(booking_id: str):
    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        if b["status"] != "CONFIRMED":
            raise HTTPException(status_code=403, detail="QR code only available for confirmed bookings")
        
        token = create_ticket_token(b["id"], b["event_id"])
        data_url = generate_qr_data_url(b["id"], b["event_id"])
        return {"dataUrl": data_url, "token": token, "ticketCode": b["ticket_code"]}

@app.get("/bookings/{booking_id}/qr/download")
def download_booking_qr(booking_id: str):
    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b or b["status"] != "CONFIRMED":
            raise HTTPException(status_code=404, detail="Confirmed booking not found")
        png_bytes = generate_qr_bytes(b["id"], b["event_id"])
        return Response(content=png_bytes, media_type="image/png")

@app.post("/scan/verify")
def verify_scan(body: ScanVerifyIn, authorization: Optional[str] = Header(None)):
    """
    Organizer entrance verification endpoint.
    Verifies cryptographic signature, verifies event matching, and atomically marks
    ticket as used to eliminate duplicate ticket usage.
    """
    verification = verify_ticket_token(body.token, body.eventId)
    if not verification["valid"]:
        return verification

    booking_id = verification["booking_id"]
    event_id = verification["event_id"]

    now_iso = datetime.now(timezone.utc).strftime("%d %b %Y %I:%M %p UTC")

    with db.get_conn() as c:
        b = c.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not b:
            return {"valid": False, "code": "NOT_FOUND", "message": "Booking not found in database."}

        if b["status"] != "CONFIRMED":
            return {"valid": False, "code": "NOT_CONFIRMED", "message": f"Booking is not confirmed (Status: {b['status']})."}

        # Atomic check-in
        cur = c.execute("""
            UPDATE bookings SET checked_in_at = ?
            WHERE id = ? AND checked_in_at IS NULL
        """, (now_iso, booking_id))

        if cur.rowcount == 0:
            already = c.execute("SELECT checked_in_at, user_name FROM bookings WHERE id = ?", (booking_id,)).fetchone()
            return {
                "valid": False,
                "code": "ALREADY_USED",
                "message": f"ALREADY USED! Checked in at {already['checked_in_at']} for {already['user_name']}.",
                "checkedInAt": already["checked_in_at"],
                "attendee": already["user_name"],
                "bookingId": booking_id,
            }

        return {
            "valid": True,
            "code": "CHECKED_IN",
            "message": "Valid Ticket! Entry Approved.",
            "attendee": b["user_name"],
            "eventTitle": b["event_title"],
            "qty": b["qty"],
            "bookingId": booking_id,
            "checkedInAt": now_iso
        }

# ----------------- College Organizer & Vendor Portal -----------------
@app.get("/organizer/events")
@app.get("/vendor/events")
def list_organizer_events(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    vendor_id = user["id"] if user else "u_organizer"
    with db.get_conn() as c:
        rows = c.execute("SELECT * FROM events WHERE organizer_id = ? OR organizer_id = 'u_vendor' ORDER BY created_at DESC", (vendor_id,)).fetchall()
        return [row_to_event(r) for r in rows]

@app.post("/organizer/events")
@app.post("/vendor/events")
def create_organizer_event(body: CreateEventIn, authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    org_id = user["id"] if user else "u_organizer"
    event_id = f"ev_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    with db.get_conn() as c:
        c.execute("""
            INSERT INTO events (
                id, title, category, event_type, college, branch, city, venue, date, price,
                capacity, description, instructor, duration, topics, certificate_available,
                opening_hours, visitor_info, rules_url, team_size, organizer_id, poster_url,
                cancellation_policy, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            event_id, body.title, body.category, body.event_type or "", body.college or (user.get("college") if user else ""),
            body.branch or "All Branches", body.city, body.venue, body.date, float(body.price),
            int(body.capacity), body.description or "", body.instructor or "", body.duration or "",
            json.dumps(body.topics or []), 1 if body.certificate_available else 0,
            body.opening_hours or "", json.dumps(body.visitor_info or []), body.rules_url or "",
            body.team_size or "1", org_id, body.poster_url or "", body.cancellation_policy or "", now_iso
        ))
        row = c.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        return row_to_event(row)

@app.put("/organizer/events/{event_id}")
@app.put("/vendor/events/{event_id}")
def update_organizer_event(event_id: str, body: CreateEventIn):
    with db.get_conn() as c:
        c.execute("""
            UPDATE events SET 
                title=?, category=?, event_type=?, college=?, branch=?, city=?, venue=?, date=?,
                price=?, capacity=?, description=?, instructor=?, duration=?, topics=?,
                certificate_available=?, opening_hours=?, visitor_info=?, rules_url=?,
                team_size=?, poster_url=?, cancellation_policy=?
            WHERE id = ?
        """, (
            body.title, body.category, body.event_type or "", body.college or "", body.branch or "All Branches",
            body.city, body.venue, body.date, float(body.price), int(body.capacity),
            body.description or "", body.instructor or "", body.duration or "", json.dumps(body.topics or []),
            1 if body.certificate_available else 0, body.opening_hours or "", json.dumps(body.visitor_info or []),
            body.rules_url or "", body.team_size or "1", body.poster_url or "", body.cancellation_policy or "",
            event_id
        ))
        row = c.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        return row_to_event(row)

@app.delete("/organizer/events/{event_id}")
@app.delete("/vendor/events/{event_id}")
def delete_organizer_event(event_id: str):
    with db.get_conn() as c:
        c.execute("DELETE FROM events WHERE id = ?", (event_id,))
        return {"ok": True}

@app.get("/organizer/events/{event_id}/participants")
@app.get("/vendor/events/{event_id}/bookings")
def get_event_participants(event_id: str):
    with db.get_conn() as c:
        rows = c.execute("SELECT * FROM bookings WHERE event_id = ? ORDER BY created_at DESC", (event_id,)).fetchall()
        return [row_to_booking(r) for r in rows]

@app.get("/organizer/stats")
@app.get("/vendor/stats")
def get_organizer_stats(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    org_id = user["id"] if user else "u_organizer"
    with db.get_conn() as c:
        events = c.execute("SELECT id, title, capacity FROM events WHERE organizer_id = ? OR organizer_id = 'u_vendor'", (org_id,)).fetchall()
        event_ids = [e["id"] for e in events]
        
        if not event_ids:
            return {"eventsCount": 0, "totalRegistrations": 0, "checkedInCount": 0, "totalRevenue": 0, "cancelledCount": 0}

        placeholders = ",".join(["?"] * len(event_ids))
        bookings = c.execute(f"SELECT * FROM bookings WHERE event_id IN ({placeholders})", event_ids).fetchall()
        
        confirmed = [b for b in bookings if b["status"] == "CONFIRMED"]
        checked_in = [b for b in confirmed if b["checked_in_at"]]
        cancelled = [b for b in bookings if b["status"] in ["CANCELLED", "REFUNDED"]]
        revenue = sum(float(b["amount"]) for b in confirmed)

        return {
            "eventsCount": len(events),
            "totalRegistrations": len(confirmed),
            "checkedInCount": len(checked_in),
            "totalRevenue": revenue,
            "cancelledCount": len(cancelled),
            "bookings": [row_to_booking(b) for b in bookings[:15]]
        }

# ----------------- Wishlist Endpoints -----------------
@app.get("/wishlist")
def get_wishlist(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    with db.get_conn() as c:
        rows = c.execute("""
            SELECT e.* FROM events e
            JOIN wishlist w ON e.id = w.event_id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        """, (user["id"],)).fetchall()
        return [row_to_event(r) for r in rows]

@app.post("/wishlist/toggle")
def toggle_wishlist(event_id: str = Query(...), authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to manage your wishlist")
    with db.get_conn() as c:
        existing = c.execute("SELECT id FROM wishlist WHERE user_id = ? AND event_id = ?", (user["id"], event_id)).fetchone()
        if existing:
            c.execute("DELETE FROM wishlist WHERE id = ?", (existing["id"],))
            return {"saved": False}
        else:
            w_id = f"w_{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            c.execute("INSERT INTO wishlist (id, user_id, event_id, created_at) VALUES (?,?,?,?)", (w_id, user["id"], event_id, now_iso))
            return {"saved": True}

# ----------------- Certificates Endpoints -----------------
@app.get("/certificates/mine")
def list_my_certificates(authorization: Optional[str] = Header(None)):
    user = get_user_from_token(authorization)
    if not user:
        return []
    with db.get_conn() as c:
        rows = c.execute("SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_date DESC", (user["id"],)).fetchall()
        return [dict(r) for r in rows]

# ----------------- AI Assistant Recommendation Engine -----------------
@app.post("/ai/chat")
def ai_chat(body: AIChatIn):
    """
    Upgraded AI assistant responding to:
    - Which technical events are available?
    - Find free workshops.
    - Suggest hackathons for engineering students.
    - Find events in Bengaluru.
    - Recommend events based on my interests.
    - Find events that provide certificates.
    """
    text = body.message.lower().strip()
    with db.get_conn() as c:
        all_events_rows = c.execute("SELECT * FROM events").fetchall()
        all_events = [row_to_event(r) for r in all_events_rows]

    matched = []
    reply_text = ""

    if "technical" in text or "college" in text or "symposium" in text or "coding" in text:
        matched = [e for e in all_events if e["category"] == "College Technical" or e["event_type"] in ["hackathon", "coding", "ai_ml", "robotics", "cybersecurity", "symposium"]]
        reply_text = f"Here are the top college technical competitions and hackathons currently open for registration:"

    elif "free workshop" in text or ("free" in text and "workshop" in text):
        matched = [e for e in all_events if e["category"] == "Workshop" and e["price"] == 0]
        reply_text = "I found these free hands-on technical workshops offering completion certificates:"

    elif "hackathon" in text or "engineering" in text:
        matched = [e for e in all_events if e["event_type"] == "hackathon" or "hackathon" in e["title"].lower()]
        reply_text = "Here are prime hackathons suited for engineering students with great prize pools and mentorship:"

    elif "bengaluru" in text or "bangalore" in text:
        matched = [e for e in all_events if e["city"].lower() == "bengaluru"]
        reply_text = f"Here are exciting events, workshops and exhibitions taking place across Bengaluru:"

    elif "certificate" in text or "certified" in text:
        matched = [e for e in all_events if e.get("certificate_available")]
        reply_text = "These events and workshops provide verified certificates of participation and completion:"

    elif "interest" in text or "recommend" in text:
        matched = [e for e in all_events if e["category"] in ["College Technical", "Workshop"]]
        reply_text = "Based on trending engineering and developer interests, here are our top recommendations:"

    elif "museum" in text or "gallery" in text or "tourism" in text:
        matched = [e for e in all_events if e["category"] == "Museum"]
        reply_text = "Explore these remarkable science, technology, art, and cultural heritage museums:"

    elif "workshop" in text:
        matched = [e for e in all_events if e["category"] == "Workshop"]
        reply_text = "Here are instructor-led professional workshops covering AI, Cloud, Cybersecurity, and Web Dev:"

    elif "free" in text:
        matched = [e for e in all_events if e["price"] == 0]
        reply_text = "Here are free events and workshops with zero registration fee:"

    else:
        # Generic search match
        matched = [e for e in all_events if any(w in e["title"].lower() or w in e["category"].lower() for w in text.split())]
        if not matched:
            matched = all_events[:4]
            reply_text = "I couldn't find an exact keyword match, but here are some of our top events:"
        else:
            reply_text = f"Found {len(matched)} matching event{'s' if len(matched) > 1 else ''}:"

    top = matched[:4]
    return {
        "text": reply_text,
        "events": [e["id"] for e in top],
        "count": len(matched)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

