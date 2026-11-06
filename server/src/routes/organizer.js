import { Router } from 'express';

/** Mounted at both /organizer and /vendor (the frontend and older clients use either). */
export function organizerRoutes({ auth, events, bookings }) {
  const r = Router();
  r.use(auth.required, auth.role('organizer', 'vendor'));

  r.get('/events', (req, res) => res.json(events.listOwned(req.user)));
  r.post('/events', (req, res) => res.status(201).json(events.create(req.user, req.body)));
  r.put('/events/:id', (req, res) => res.json(events.update(req.user, req.params.id, req.body)));
  r.delete('/events/:id', (req, res) => res.json(events.remove(req.user, req.params.id)));
  r.get('/events/:id/participants', (req, res) => res.json(bookings.listForEvent(req.user, req.params.id)));
  r.get('/events/:id/bookings', (req, res) => res.json(bookings.listForEvent(req.user, req.params.id)));
  r.get('/bookings', (req, res) => res.json(bookings.listForOwner(req.user)));
  r.get('/stats', (req, res) => res.json(bookings.stats(req.user)));

  return r;
}
