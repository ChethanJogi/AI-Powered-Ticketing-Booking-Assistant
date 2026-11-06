import { Router } from 'express';
import crypto from 'node:crypto';
import { wrap, bad, notFound, unauthorized } from '../errors.js';
import { reviewOut } from '../mappers.js';

export function eventRoutes({ db, auth, events, bookings }) {
  const r = Router();

  r.get('/', (req, res) => res.json(events.list(req.query)));
  r.get('/cities', (_req, res) => res.json(events.distinct('city')));
  r.get('/colleges', (_req, res) => res.json(events.distinct('college')));
  r.get('/types', (_req, res) => res.json(events.distinct('event_type')));
  r.get('/:id', (req, res) => res.json(events.get(req.params.id)));
  r.get('/:id/availability', (req, res) => res.json(bookings.seatsLeft(req.params.id)));

  r.get('/:id/reviews', (req, res) => {
    events.get(req.params.id);
    const list = db.prepare('SELECT * FROM reviews WHERE event_id = ? ORDER BY created_at DESC').all(req.params.id).map(reviewOut);
    const avg = list.length ? list.reduce((s, x) => s + x.rating, 0) / list.length : 0;
    res.json({ reviews: list, average: Math.round(avg * 10) / 10, count: list.length });
  });

  r.post('/:id/reviews', auth.required, (req, res) => {
    events.get(req.params.id);
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim().slice(0, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('Rating must be between 1 and 5');
    if (!comment) throw bad('Please write a short comment');
    const id = 'rev_' + crypto.randomBytes(4).toString('hex');
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO reviews (id,event_id,user_id,user_name,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, req.params.id, req.user.id, req.user.name, rating, comment, createdAt);
    res.status(201).json({ id, eventId: req.params.id, userId: req.user.id, userName: req.user.name, rating, comment, createdAt });
  });

  return r;
}
