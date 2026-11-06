# TicketAI – Express API

Node.js + Express + SQLite. Replaces the old FastAPI backend and speaks the exact JSON shapes
(camelCase) the React frontend in `../src/services` already uses.

**Requires Node 22.13+** (uses the built-in `node:sqlite`, so there is no native module to compile).

```bash
cd server
cp .env.example .env     # set JWT_SECRET and QR_SECRET
npm install
npm start                # http://localhost:8000   (npm run dev = auto-reload)
npm test                 # in-memory DB + fake WhatsApp, no network
```

The database (`server/data/ticketai.db`) is created and seeded on first start with the 26 sample events,
reviews and the three demo accounts (password `demo123`): `demo@ticketai.in` (user),
`organizer@ticketai.in`, `vendor@ticketai.in`. Set `TZ=Asia/Kolkata` so reminder timing matches event times.

## API contract

Auth: `Authorization: Bearer <jwt>` (7-day token from login/register). Errors are `{ "message": "..." }`.

| Method & path | Auth | Notes |
|---|---|---|
| `POST /auth/register` `/auth/login` | – | → `{ user, token }` (rate-limited, bcrypt) |
| `GET/PUT /auth/me` | user | profile (`name, phone, language, college`) |
| `POST /auth/forgot-password`, `/auth/reset-password` | – | signed 30-min one-time token; token is only returned outside production (no email sender yet) |
| `GET /events` | – | query: `q, category, event_type, college, branch, city, price, days, has_certificate, free_only, sort` |
| `GET /events/cities` `/colleges` `/types` `/:id` `/:id/availability` | – | |
| `GET/POST /events/:id/reviews` | POST needs login | |
| `POST /bookings` | user | `{ eventId, qty (1-10), teamName, attendees, idempotencyKey }` → HELD for 10 min |
| `GET /bookings/mine` `/bookings/:id` | owner | organizer of the event may read `:id` |
| `POST /bookings/:id/pay` `/cancel` `/reminder` | owner | pay is a **sandbox** (see below) |
| `GET /bookings/:id/qr` `/qr/download` | owner, CONFIRMED | HMAC-SHA256 signed QR |
| `POST /scan/verify` | organizer/vendor | `{ token, eventId? }`, atomic one-time check-in, own events only |
| `GET/POST/PUT/DELETE /organizer/events…` (alias `/vendor/…`) | organizer/vendor | only the creator can edit/delete/list participants |
| `GET /organizer/bookings` `/organizer/stats` | organizer/vendor | bookings across own events |
| `GET /wishlist` `/wishlist/ids`, `POST /wishlist/toggle?event_id=` | user | |
| `GET /certificates/mine` | user | auto-issued when a certificate event is paid |
| `POST /ai/chat` | optional | `{ message }` → `{ text, events: [ids] }`, answers from live DB rows |
| `GET/POST /whatsapp/webhook` | Meta | verify token + `X-Hub-Signature-256` |
| `GET /whatsapp/status`, `POST /whatsapp/link-code`, `PUT /whatsapp/preferences`, `DELETE /whatsapp/link` | user | account linking |
| `GET /health` | – | |

Booking states: `HELD → CONFIRMED → REFUNDED`, `HELD → EXPIRED | CANCELLED`. Seats are counted inside an
`IMMEDIATE` transaction so two people cannot take the last seat.

## WhatsApp (Meta Cloud API)

What it does
* **Bot**: send "free workshops", "hackathons in Bengaluru", `BOOK <event id> 2`, `BOOKINGS`,
  `TICKET <id>` (sends the QR image), `CANCEL <id>` (asks YES/NO), `NOTIFY OFF`, `HELP`.
* **Notifications**: QR ticket on payment, refund note on cancellation, 24 h reminder (if the user switched the reminder on).
* **Linking**: Profile → WhatsApp → *Get link code* → send `LINK 123456` from WhatsApp. A one-time code proves the
  number belongs to that account (the profile phone field is unverified, so it is **not** used for matching).

Setup
1. In [developers.facebook.com](https://developers.facebook.com) create an app → add **WhatsApp**. Copy the
   *temporary/permanent access token*, the *Phone number ID* and the *App secret*.
2. Fill `.env`: `WHATSAPP_ENABLED=true`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
   `WHATSAPP_VERIFY_TOKEN` (any string you choose), `WHATSAPP_PUBLIC_NUMBER` (for the *Open chat* button).
3. Expose the server over HTTPS (e.g. `ngrok http 8000`) and in *WhatsApp → Configuration* set
   Callback URL `https://<host>/whatsapp/webhook`, the same verify token, and subscribe to **messages**.
4. While the app is in test mode, add your phone as a test recipient.

Meta rules to know: free-form messages only work inside 24 h of the user's last message. For ticket/reminder messages
outside that window create an approved template with 3 body variables (`{{1}}` event, `{{2}}` date, `{{3}}` booking id)
and set `WHATSAPP_TEMPLATE_BOOKING`; the server falls back to it automatically. In production the server refuses to
start with WhatsApp on but no `WHATSAPP_APP_SECRET` (unsigned webhooks would let anyone fake messages).

## Before real money
`POST /bookings/:id/pay` currently marks the booking paid without charging anyone (the original app's sandbox
button). Put your gateway (Razorpay/Stripe) confirmation in `src/services/bookings.js → pay()` and verify the
gateway's webhook signature before setting `CONFIRMED`.
