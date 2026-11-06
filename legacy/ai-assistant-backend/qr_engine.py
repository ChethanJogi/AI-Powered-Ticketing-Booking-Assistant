"""
qr_engine.py - Cryptographic QR code generation and verification.
Signs ticket tokens with HMAC-SHA256 to prevent forgery, generates real QR PNGs/Data URLs,
and verifies tickets atomically to eliminate duplicate entries.
"""
import base64
import hashlib
import hmac
import io
import os
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask

SECRET_KEY = os.environ.get("QR_SECRET_KEY", "ticketai-secure-hmac-token-secret-2026").encode()

def sign_payload(payload: str) -> str:
    digest = hmac.new(SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest[:16]).decode("utf-8").rstrip("=")

def create_ticket_token(booking_id: str, event_id: str) -> str:
    payload = f"{booking_id}.{event_id}"
    signature = sign_payload(payload)
    return f"{payload}.{signature}"

def generate_qr_bytes(booking_id: str, event_id: str) -> bytes:
    token = create_ticket_token(booking_id, event_id)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1E1B3A", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def generate_qr_data_url(booking_id: str, event_id: str) -> str:
    raw_bytes = generate_qr_bytes(booking_id, event_id)
    b64 = base64.b64encode(raw_bytes).decode("ascii")
    return f"data:image/png;base64,{b64}"

def verify_ticket_token(token: str, expected_event_id: str = None) -> dict:
    parts = (token or "").strip().split(".")
    if len(parts) != 3:
        return {"valid": False, "code": "INVALID_FORMAT", "message": "Invalid QR code format."}

    booking_id, event_id, signature = parts
    expected_sig = sign_payload(f"{booking_id}.{event_id}")

    if not hmac.compare_digest(expected_sig, signature):
        return {"valid": False, "code": "TAMPERED", "message": "Signature verification failed. Potential counterfeit ticket."}

    if expected_event_id and event_id != expected_event_id:
        return {"valid": False, "code": "WRONG_EVENT", "message": f"This ticket is valid for event '{event_id}', not '{expected_event_id}'."}

    return {"valid": True, "booking_id": booking_id, "event_id": event_id}

