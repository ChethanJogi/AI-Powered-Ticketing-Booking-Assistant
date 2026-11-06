import { Router } from 'express';
import { bad, notFound } from '../errors.js';
import { eventOut, certificateOut } from '../mappers.js';

export function wishlistRoutes({ db, auth }) {
  const r = Router();
  r.use(auth.required);

  r.get('/', (req, res) => {
    const rows = db.prepare('SELECT e.* FROM events e JOIN wishlist w ON w.event_id = e.id WHERE w.user_id = ? ORDER BY w.created_at DESC').all(req.user.id);
    res.json(rows.map(eventOut));
  });
  r.get('/ids', (req, res) =>
    res.json(db.prepare('SELECT event_id FROM wishlist WHERE user_id = ?').all(req.user.id).map((x) => x.event_id)));

  r.post('/toggle', (req, res) => {
    const eventId = String(req.query.event_id || req.body?.eventId || '');
    if (!eventId) throw bad('event_id is required');
    if (!db.prepare('SELECT 1 FROM events WHERE id = ?').get(eventId)) throw notFound('Event not found');
    const del = db.prepare('DELETE FROM wishlist WHERE user_id = ? AND event_id = ?').run(req.user.id, eventId);
    if (del.changes) return res.json({ saved: false });
    db.prepare('INSERT INTO wishlist (user_id,event_id,created_at) VALUES (?,?,?)').run(req.user.id, eventId, Date.now());
    res.json({ saved: true });
  });
  return r;
}

export function certificateRoutes({ db, auth }) {
  const r = Router();
  r.get('/mine', auth.required, (req, res) =>
    res.json(db.prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY rowid DESC').all(req.user.id).map(certificateOut)));
  return r;
}

export function aiRoutes({ auth, ai }) {
  const r = Router();
  r.post('/chat', auth.optional, (req, res) => {
    const message = String(req.body?.message || '').trim();
    if (!message) throw bad('Please type a question');
    const out = ai.chat(message, { userId: req.user?.id });
    res.json({ text: out.text, events: out.events.map((e) => e.id) });
  });
  return r;
}

export function scanRoutes({ auth, bookings }) {
  const r = Router();
  r.post('/verify', auth.required, auth.role('organizer', 'vendor', 'admin'), (req, res) =>
    res.json(bookings.scan(req.user, req.body?.token, req.body?.eventId)));
  return r;
}
