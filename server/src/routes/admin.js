import { Router } from 'express';
import crypto from 'node:crypto';
import { bad, forbidden, notFound } from '../errors.js';
import { eventOut } from '../mappers.js';

const clampInt = (v, d, min, max) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || d));
const text = (v, max = 120) => String(v ?? '').trim().slice(0, max);

/**
 * Admin API. Authentication resolves the user from the database; every route is admin-only.
 * Refund actions update the local sandbox booking record. No payment gateway is configured here.
 */
export function adminRoutes({ db, auth, qr }) {
  const r = Router();
  r.use(auth.required, auth.role('admin'));

  const count = (sql, ...a) => db.prepare(sql).get(...a).n;
  const safeUser = (u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role, college: u.college, phone: u.phone,
    whatsappLinked: !!u.whatsapp_number, createdAt: u.created_at, isActive: u.is_active !== 0,
  });
  const audit = (admin, action, targetType, targetId, details = '') => {
    db.prepare(`INSERT INTO admin_actions (id,admin_id,action,target_type,target_id,details,created_at)
      VALUES (?,?,?,?,?,?,?)`).run(`adm_${crypto.randomBytes(6).toString('hex')}`, admin.id, action, targetType, targetId, text(details, 500), Date.now());
  };

  r.get('/dashboard', (_req, res) => {
    const byStatus = Object.fromEntries(
      db.prepare('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all().map((x) => [x.status, x.n])
    );
    res.json({
      total_users: count("SELECT COUNT(*) AS n FROM users WHERE role = 'user'"),
      total_vendors: count("SELECT COUNT(*) AS n FROM users WHERE role IN ('vendor','organizer')"),
      total_events: count('SELECT COUNT(*) AS n FROM events'),
      total_bookings: count('SELECT COUNT(*) AS n FROM bookings'),
      confirmed_bookings: byStatus.CONFIRMED || 0,
      bookings_by_status: byStatus,
      revenue: db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM bookings WHERE status = 'CONFIRMED'").get().n,
      checked_in: count('SELECT COUNT(*) AS n FROM bookings WHERE checked_in_at IS NOT NULL'),
    });
  });

  r.get('/users', (req, res) => {
    const limit = clampInt(req.query.limit, 100, 1, 500);
    const offset = clampInt(req.query.offset, 0, 0, 1e9);
    const role = text(req.query.role, 20);
    const q = `%${text(req.query.q, 100).replace(/[%_]/g, '')}%`;
    const rows = db.prepare(`SELECT * FROM users
      WHERE (? = '' OR role = ?) AND (name LIKE ? OR email LIKE ? OR id LIKE ?)
      ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(role, role, q, q, q, limit, offset);
    res.json(rows.map(safeUser));
  });

  r.get('/vendors', (_req, res) => {
    const rows = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM events e WHERE e.vendor_id = u.id) AS event_count
      FROM users u WHERE u.role IN ('vendor','organizer') ORDER BY u.created_at DESC`).all();
    res.json(rows.map((u) => ({ ...safeUser(u), eventCount: u.event_count })));
  });

  r.get('/events', (req, res) => {
    const limit = clampInt(req.query.limit, 200, 1, 500);
    const q = `%${text(req.query.q, 100).replace(/[%_]/g, '')}%`;
    const rows = db.prepare(`SELECT * FROM events WHERE title LIKE ? OR id LIKE ? OR city LIKE ?
      ORDER BY created_at DESC LIMIT ?`).all(q, q, q, limit);
    res.json(rows.map(eventOut));
  });

  r.get('/bookings', (req, res) => {
    const limit = clampInt(req.query.limit, 200, 1, 500);
    const q = `%${text(req.query.q, 100).replace(/[%_]/g, '')}%`;
    const rows = db.prepare(`SELECT id, event_id, event_title, event_date, user_id, user_name, user_email, qty,
      amount, status, created_at, checked_in_at, payment_ref
      FROM bookings WHERE id LIKE ? OR user_name LIKE ? OR user_email LIKE ? OR event_title LIKE ?
      ORDER BY created_at DESC LIMIT ?`).all(q, q, q, q, limit);
    res.json(rows.map((b) => ({
      id: b.id, eventId: b.event_id, eventTitle: b.event_title, eventDate: b.event_date, userId: b.user_id,
      userName: b.user_name, userEmail: b.user_email, qty: b.qty, amount: b.amount, status: b.status,
      createdAt: b.created_at, checkedInAt: b.checked_in_at, paymentRef: b.payment_ref,
      ticketToken: b.status === 'CONFIRMED' ? qr.createToken(b.id, b.event_id) : undefined,
    })));
  });

  r.patch('/users/:id/status', (req, res) => {
    const id = text(req.params.id, 100);
    const active = req.body?.active;
    if (typeof active !== 'boolean') throw bad('active must be true or false');
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) throw notFound('User not found');
    if (target.role === 'admin') throw forbidden('Admin accounts cannot be suspended from this panel');
    if (target.id === req.user.id) throw forbidden('You cannot suspend your own account');
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
    audit(req.user, active ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_SUSPENDED', 'user', id);
    res.json({ ok: true, user: safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  });

  r.patch('/vendors/:id/status', (req, res) => {
    const id = text(req.params.id, 100);
    const active = req.body?.active;
    if (typeof active !== 'boolean') throw bad('active must be true or false');
    const target = db.prepare("SELECT * FROM users WHERE id = ? AND role IN ('vendor','organizer')").get(id);
    if (!target) throw notFound('Vendor or organizer not found');
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
    audit(req.user, active ? 'VENDOR_REACTIVATED' : 'VENDOR_SUSPENDED', 'user', id);
    res.json({ ok: true, user: safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  });

  r.delete('/events/:id', (req, res) => {
    const id = text(req.params.id, 100);
    const event = db.prepare('SELECT id,title FROM events WHERE id = ?').get(id);
    if (!event) throw notFound('Event not found');
    const related = count('SELECT COUNT(*) AS n FROM bookings WHERE event_id = ?', id);
    if (related) throw bad(`This event has ${related} booking record(s). Preserve booking history; cancel/refund bookings before removing it.`);
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    audit(req.user, 'EVENT_REMOVED', 'event', id, event.title);
    res.json({ ok: true });
  });

  r.post('/bookings/:id/refund', (req, res) => {
    const id = text(req.params.id, 100);
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!row) throw notFound('Booking not found');
    if (row.status !== 'CONFIRMED') throw bad(`Only confirmed bookings can be refunded. Current status: ${row.status}`);
    if (row.checked_in_at) throw bad('A checked-in ticket cannot be refunded from the admin panel');
    const result = db.prepare("UPDATE bookings SET status = 'REFUNDED', cancelled_at = ? WHERE id = ? AND status = 'CONFIRMED' AND checked_in_at IS NULL").run(Date.now(), id);
    if (!result.changes) throw bad('Booking changed before the refund could be recorded. Refresh and try again.');
    audit(req.user, 'BOOKING_MARKED_REFUNDED', 'booking', id, `Sandbox/manual status update; amount ${row.amount}`);
    res.json({ ok: true, status: 'REFUNDED', paymentAction: 'NOT_PROCESSED', message: 'Booking marked refunded in TicketAI. No external payment was sent because no payment gateway is connected.' });
  });

  r.get('/audit', (req, res) => {
    const limit = clampInt(req.query.limit, 100, 1, 500);
    const rows = db.prepare(`SELECT a.*, u.name AS admin_name FROM admin_actions a
      LEFT JOIN users u ON u.id = a.admin_id ORDER BY a.created_at DESC LIMIT ?`).all(limit);
    res.json(rows.map((a) => ({
      id: a.id, adminId: a.admin_id, adminName: a.admin_name || 'Unknown admin', action: a.action,
      targetType: a.target_type, targetId: a.target_id, details: a.details, createdAt: a.created_at,
    })));
  });

  r.get('/reports', (_req, res) => {
    const popular = db.prepare(`SELECT event_id AS eventId, event_title AS eventTitle,
      COUNT(*) AS bookings, COALESCE(SUM(qty),0) AS tickets
      FROM bookings GROUP BY event_id,event_title ORDER BY tickets DESC LIMIT 10`).all();
    const byStatus = db.prepare('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status').all();
    res.json({ popularEvents: popular, bookingsByStatus: byStatus,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM bookings WHERE status = 'CONFIRMED'").get().n,
      totalCheckIns: count('SELECT COUNT(*) AS n FROM bookings WHERE checked_in_at IS NOT NULL') });
  });

  return r;
}
