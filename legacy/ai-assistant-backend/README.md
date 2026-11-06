# TicketAI FastAPI Backend

Complete production-grade backend for TicketAI.

## Features
- **Authentication**: JWT/Token authentication, login, registration with roles (`user`, `vendor`, `organizer`), profile update.
- **Events**: Search and filter by category (Music, Comedy, Conference, Culture, College Technical, Workshop, Museum), branch, city, price, dates, certificates.
- **Bookings**: Atomic seat hold (10 min expiration), idempotency keys to prevent duplicate booking, payments, cancellations with refund policies.
- **Cryptographic QR Ticketing**: HMAC-SHA256 signed QR codes, download endpoints, and real-time organizer scan verification with duplicate check-in prevention.
- **College Organizer Portal**: Event creation, poster uploads, participant roster management, ticket capacity controls, analytics KPIs.
- **Wishlist & Reviews**: Real-time user ratings and saved events.
- **Certificates**: Auto-generation and listing for technical events and workshops.
- **AI Recommendation Engine**: Natural language understanding answering user queries using live database events.

## Run Backend
```bash
# From the frontend root:
python -m uvicorn backend.main:app --reload --port 8000
```
Or:
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/docs`

