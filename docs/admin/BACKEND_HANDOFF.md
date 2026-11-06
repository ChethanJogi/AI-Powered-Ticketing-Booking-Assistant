# TicketAI Admin Portal — Backend Integration Handoff

## Included frontend files

- `src/routes/AdminRoute.jsx` — client-side route guard; requires an authenticated user with `role === 'admin'`.
- `src/components/admin/AdminLayout.jsx` — admin sidebar, header, logout, and nested route outlet.
- `src/pages/admin/AdminDashboardPage.jsx` — dashboard shell with placeholder statistic values.
- `src/styles/admin.css` — styles for the admin shell and dashboard.
- `ROUTE_INTEGRATION.txt` — instructions for registering the admin route in the existing `AppRoutes.jsx`.

## Current state

This is the admin frontend shell, not a completed admin system. Dashboard figures intentionally show `—`; they are not connected to live APIs. User/vendor/event/booking/report screens are not included yet. Sidebar links for those screens are placeholders.

## Backend developer tasks

1. Confirm the admin role is assigned by the backend after successful authentication. The frontend guard is only a navigation/UI check; it is not authorization security.
2. Enforce admin authorization on every admin API endpoint on the server. Never rely on `user.role` from browser storage alone.
3. Provide a dashboard summary endpoint, for example `GET /api/v1/admin/dashboard`, returning counts for users, vendors, events, and bookings.
4. Agree on endpoint contracts for users, vendors, events, bookings, and reports before the corresponding frontend pages are built.
5. Return consistent JSON errors and appropriate HTTP status codes (401 unauthenticated, 403 forbidden, 404 missing record, 422 validation error).
6. Ensure passwords are securely hashed; do not store or return plaintext passwords.

## Suggested dashboard response shape

```json
{
  "total_users": 0,
  "total_vendors": 0,
  "total_events": 0,
  "total_bookings": 0
}
```

The endpoint path and response shape are proposals for coordination, not claims that this endpoint already exists.

## Important integration notes

- Existing frontend auth context must expose `user` and `logout` from `useAuth()`.
- The admin route must be registered outside the customer `PageLayout` route to avoid showing customer navigation and footer in the admin portal.
- The frontend currently redirects non-admin users to `/events` and unauthenticated users to `/login`.
