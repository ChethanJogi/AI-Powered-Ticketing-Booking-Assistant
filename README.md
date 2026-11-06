# TicketAI – AI-Powered Ticketing & Booking Assistant

React + Vite frontend, Express + SQLite backend, WhatsApp bot (Meta Cloud API), and an Admin Portal.

## Quick start (full stack)

```bash
npm run setup                          # installs frontend + server deps (Node 22.13+)
cp server/.env.example server/.env     # set JWT_SECRET / QR_SECRET
cp .env.example .env                   # VITE_API_URL=http://localhost:8000
npm run server                         # terminal 1 → API on :8000
npm run dev                            # terminal 2 → app on :5173
```

## Demo mode (no backend)
Leave `VITE_API_URL` empty (or don't create `.env`). All data lives in your browser's localStorage.

| Role      | Email                 | Password |
|-----------|-----------------------|----------|
| User      | demo@ticketai.in      | demo123  |
| Vendor    | vendor@ticketai.in    | demo123  |
| Organizer | organizer@ticketai.in | demo123  |

If you switch from demo mode to the backend (or back), clear site data once or just log in again.

Try: log in → open an event → **Hold tickets** → pay (sandbox) → see the QR → log in as the organizer →
**QR Scanner** → paste/click the token → second scan shows *ALREADY USED*.

## Docs
* Backend, API table, WhatsApp setup: [`server/README.md`](server/README.md)
* Env files: `.env.example` (frontend), `server/.env.example` (backend)

## Layout
`src/` components, pages, services (one file per API area), state, routes, styles ·
`server/src/` routes, services (events, bookings, ai), whatsapp (client, bot, notify), db, qr ·
`server/test/` logic tests (`npm run server:test`).

## Admin portal
Log in as the admin → you land on `/admin` (live counts of users, vendors/organizers, events, bookings, revenue).
* Frontend: `src/components/admin`, `src/pages/admin`, `src/routes/AdminRoute.jsx`, `src/services/adminService.js`.
* Backend: `server/src/routes/admin.js` – `GET /admin/dashboard | users | vendors | events | bookings`.
  Each request is checked against the database user's role (the browser's role value is never trusted): 401 / 403 otherwise.
* In production set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`; the `admin@ticketai.in / demo123` account is only created outside production.
* Users / Vendors / Events / Bookings / Reports sidebar pages are still placeholders (the API for the first four exists). Original handoff notes: `docs/admin/`.

## `legacy/`
`legacy/ai-assistant-backend/` is the original AI-module backend (Node + MongoDB LLM assistant with tool-calling and
approve/reject flow, plus a FastAPI backend). It is **not** used by the running app; the Express/SQLite `server/`
replaced it and has a simpler built-in assistant (`POST /ai/chat`). Kept so the LLM assistant can be ported later.
