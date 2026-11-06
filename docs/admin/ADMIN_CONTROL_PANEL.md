# TicketAI Admin Control Panel — Included Features

The Admin portal is available at `/admin` after signing in with an account whose backend role is `admin`.

## Modules

- Dashboard: live user, vendor/organizer, event, booking, confirmed booking, check-in and confirmed-booking-value metrics.
- Users: search users and suspend/reactivate non-admin accounts.
- Vendors & Organizers: list platform event partners and suspend/reactivate accounts.
- Events: list and search events; remove an event only when it has no booking records. Booking history is preserved.
- Bookings: search bookings and mark an eligible, unused confirmed booking as `REFUNDED`.
- Global QR Scanner: verify a signed ticket token for any event. The existing atomic check-in update continues to reject duplicate scans.
- Reports: booking status summary, popular events and check-in count.
- Audit Log: records administrative account, event and booking actions.

## Important limitations

1. The scanner currently accepts a signed token pasted from a QR reader. A live camera/QR decoder UI is not included.
2. The payment flow in this project is a sandbox. The Admin refund action changes the local booking status and writes an audit entry; it does not issue a bank/card refund or call a payment provider.
3. Event moderation currently supports viewing and safe removal. An event with any booking history cannot be deleted. A submission approval/unpublish workflow is not part of the current event data model.
4. User/vendor account suspension blocks future login and invalidates subsequent authenticated requests. Admin accounts are protected from suspension in this panel.
5. Audit records cover actions performed through the new Admin endpoints; they are not a complete historical log of all past platform activity.

## Existing database compatibility

The server adds the `users.is_active` column to an existing SQLite database when it starts. The `admin_actions` table is created by the normal schema initialization. Existing user rows default to active.

## Local verification

Run backend tests from the project root:

```powershell
npm run server:test
```

The Admin additions were verified with the full backend test suite: 14 tests passed. The frontend production build could not be verified in this environment because frontend package installation did not complete.
