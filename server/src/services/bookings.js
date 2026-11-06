import crypto from 'node:crypto';
import { tx } from '../db.js';
import { bookingOut } from '../mappers.js';
import { bad, forbidden, notFound } from '../errors.js';

const rid = (n) => crypto.randomBytes(n).toString('hex').toUpperCase();

export function makeBookingService({ db, config, qr, bus }) {
  const getRow = db.prepare('SELECT * FROM bookings WHERE id = ?');
  const getEvent = db.prepare('SELECT * FROM events WHERE id = ?');

  function sweepExpired() {
    db.prepare("UPDATE bookings SET status = 'EXPIRED' WHERE status = 'HELD' AND hold_expires_at < ?").run(Date.now());
  }

  function seatsLeft(eventId) {
    sweepExpired();
    const ev = getEvent.get(eventId);
    if (!ev) throw notFound('Event not found');
    const used = db
      .prepare("SELECT COALESCE(SUM(qty),0) AS n FROM bookings WHERE event_id = ? AND status IN ('HELD','CONFIRMED')")
      .get(eventId).n;
    return { seatsLeft: Math.max(0, ev.capacity - used), capacity: ev.capacity, booked: used };
  }

  /** Owner, or the vendor/organizer who owns the event, may see a booking. */
  function authorize(user, row, { ownerOnly = false } = {}) {
    if (!row) throw notFound('Booking not found');
    if (row.user_id === user.id) return;
    if (!ownerOnly) {
      const ev = getEvent.get(row.event_id);
      if (ev && ev.vendor_id === user.id) return;
    }
    throw forbidden('This booking belongs to another account');
  }

  /** Booking JSON for a given viewer. The signed ticket token is only included for confirmed bookings. */
  function present(row, viewer) {
    const extra = {};
    if (row.status === 'CONFIRMED' && viewer) {
      const ev = getEvent.get(row.event_id);
      if (row.user_id === viewer.id || ev?.vendor_id === viewer.id) {
        extra.ticketToken = qr.createToken(row.id, row.event_id);
      }
    }
    return { ...bookingOut(row, extra), vendorId: getEvent.get(row.event_id)?.vendor_id };
  }

  function create(user, { eventId, qty = 1, teamName = '', attendees = [], idempotencyKey = '' }) {
    qty = Number(qty);
    if (!Number.isInteger(qty) || qty < 1) throw bad('Choose at least 1 ticket');
    if (qty > 10) throw bad('You can book at most 10 tickets at a time');
    const key = String(idempotencyKey || '').slice(0, 100);
    const names = Array.isArray(attendees) ? attendees.map((a) => String(a).trim().slice(0, 100)).filter(Boolean).slice(0, 10) : [];

    return tx(db, () => {
      sweepExpired();
      if (key) {
        const dup = db.prepare('SELECT * FROM bookings WHERE user_id = ? AND idempotency_key = ?').get(user.id, key);
        if (dup) return present(dup, user);
      }
      const ev = getEvent.get(eventId);
      if (!ev) throw notFound('Event not found');
      if (new Date(ev.date).getTime() < Date.now()) throw bad('This event has already taken place');

      const held = db.prepare("SELECT * FROM bookings WHERE user_id = ? AND event_id = ? AND status = 'HELD'").get(user.id, eventId);
      if (held) return present(held, user);

      const { seatsLeft: left } = seatsLeft(eventId);
      if (qty > left) throw bad(left === 0 ? 'Sold out' : `Only ${left} ticket${left > 1 ? 's' : ''} left`);

      const id = 'BK_' + rid(4);
      const now = Date.now();
      db.prepare(`INSERT INTO bookings (
        id,event_id,event_title,event_date,venue,user_id,user_name,user_email,qty,team_name,attendees,amount,
        status,hold_expires_at,cancellation_policy,idempotency_key,created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, ev.id, ev.title, ev.date, ev.venue, user.id, user.name, user.email, qty,
        String(teamName || '').trim().slice(0, 100), JSON.stringify(names),
        qty * ev.price, 'HELD', now + config.holdMinutes * 60_000, ev.cancellation_policy, key || null, now
      );
      return present(getRow.get(id), user);
    });
  }

  function pay(user, id) {
    const out = tx(db, () => {
      sweepExpired();
      const row = getRow.get(id);
      authorize(user, row, { ownerOnly: true });
      if (row.status === 'EXPIRED') throw bad('Your hold expired. Please book again.');
      if (row.status !== 'HELD') throw bad(`This booking cannot be paid (status: ${row.status})`);

      // NOTE: sandbox payment. Replace with a real gateway (Razorpay/Stripe) confirmation
      // before marking CONFIRMED - see server/README.md.
      const ticketCode = 'TKT-' + rid(3);
      db.prepare("UPDATE bookings SET status = 'CONFIRMED', ticket_code = ?, payment_ref = ? WHERE id = ?")
        .run(ticketCode, 'pay_' + rid(4).toLowerCase(), id);

      const ev = getEvent.get(row.event_id);
      if (ev?.certificate_available) {
        db.prepare(`INSERT OR IGNORE INTO certificates (id,booking_id,event_id,event_title,user_id,user_name,certificate_no,issued_date)
          VALUES (?,?,?,?,?,?,?,?)`).run(
          'cert_' + rid(4).toLowerCase(), id, ev.id, ev.title, row.user_id, row.user_name,
          `CERT-${rid(3)}-${new Date().getFullYear()}`,
          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        );
      }
      return getRow.get(id);
    });
    bus.emit('booking.confirmed', out);
    return present(out, user);
  }

  function cancel(user, id) {
    const out = tx(db, () => {
      const row = getRow.get(id);
      authorize(user, row, { ownerOnly: true });
      if (row.status === 'CHECKED_IN' || row.checked_in_at) throw bad('This ticket has already been used');
      let next;
      if (row.status === 'CONFIRMED') next = 'REFUNDED';
      else if (row.status === 'HELD') next = 'CANCELLED';
      else throw bad('This booking cannot be cancelled');
      db.prepare('UPDATE bookings SET status = ?, cancelled_at = ? WHERE id = ?').run(next, Date.now(), id);
      return getRow.get(id);
    });
    bus.emit('booking.cancelled', out);
    return present(out, user);
  }

  function toggleReminder(user, id) {
    const row = getRow.get(id);
    authorize(user, row, { ownerOnly: true });
    const next = row.reminder_set ? 0 : 1;
    db.prepare('UPDATE bookings SET reminder_set = ? WHERE id = ?').run(next, id);
    return !!next;
  }

  function get(user, id) {
    sweepExpired();
    const row = getRow.get(id);
    authorize(user, row);
    return present(row, user);
  }

  function listMine(user) {
    sweepExpired();
    return db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC').all(user.id).map((r) => present(r, user));
  }

  function listForEvent(user, eventId) {
    sweepExpired();
    const ev = getEvent.get(eventId);
    if (!ev) throw notFound('Event not found');
    if (ev.vendor_id !== user.id) throw forbidden('You can only view participants of your own events');
    return db.prepare('SELECT * FROM bookings WHERE event_id = ? ORDER BY created_at DESC').all(eventId).map((r) => present(r, user));
  }

  function listForOwner(user) {
    sweepExpired();
    return db
      .prepare(`SELECT b.* FROM bookings b JOIN events e ON e.id = b.event_id
                WHERE e.vendor_id = ? ORDER BY b.created_at DESC`)
      .all(user.id)
      .map((r) => present(r, user));
  }

  function stats(user) {
    const bookings = listForOwner(user);
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    return {
      eventsCount: db.prepare('SELECT COUNT(*) AS n FROM events WHERE vendor_id = ?').get(user.id).n,
      totalRegistrations: confirmed.length,
      checkedInCount: confirmed.filter((b) => b.checkedInAt).length,
      totalRevenue: confirmed.reduce((s, b) => s + b.amount, 0),
      cancelledCount: bookings.filter((b) => ['CANCELLED', 'REFUNDED'].includes(b.status)).length,
      bookings: bookings.slice(0, 50),
    };
  }

  /** Organizer scans a ticket QR at the gate. Check-in is a single atomic UPDATE so a ticket can't be used twice. */
  function scan(user, token, expectedEventId) {
    const v = qr.verifyToken(token, expectedEventId || null);
    if (!v.valid) return v;
    return tx(db, () => {
      const row = getRow.get(v.bookingId);
      if (!row) return { valid: false, code: 'NOT_FOUND', message: 'Booking record not found in system.' };
      const ev = getEvent.get(row.event_id);
      if (!ev || (user.role !== 'admin' && ev.vendor_id !== user.id)) {
        return { valid: false, code: 'NOT_YOUR_EVENT', message: 'This ticket is for an event you do not manage.' };
      }
      if (row.status !== 'CONFIRMED') {
        return { valid: false, code: 'NOT_CONFIRMED', message: `Ticket status is ${row.status}, not confirmed.` };
      }
      const stamp = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
      const r = db.prepare('UPDATE bookings SET checked_in_at = ? WHERE id = ? AND checked_in_at IS NULL').run(stamp, row.id);
      if (r.changes === 0) {
        const again = getRow.get(row.id);
        return {
          valid: false, code: 'ALREADY_USED',
          message: `ALREADY USED! Checked in on ${again.checked_in_at} for attendee ${again.user_name}.`,
          attendee: again.user_name, checkedInAt: again.checked_in_at, bookingId: again.id,
        };
      }
      return {
        valid: true, code: 'CHECKED_IN', message: 'Valid Ticket! Entry Approved.',
        attendee: row.user_name, eventTitle: row.event_title, qty: row.qty, bookingId: row.id, checkedInAt: stamp,
      };
    });
  }

  return { sweepExpired, seatsLeft, create, pay, cancel, toggleReminder, get, listMine, listForEvent, listForOwner, stats, scan, present };
}
