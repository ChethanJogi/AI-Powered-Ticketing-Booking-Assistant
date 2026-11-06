import { Router } from 'express';
import { wrap, forbidden, bad } from '../errors.js';

export function bookingRoutes({ auth, bookings, qr }) {
  const r = Router();
  r.use(auth.required);

  r.post('/', (req, res) => {
    const b = bookings.create(req.user, req.body || {});
    res.status(201).json(b);
  });

  // NOTE: must be declared before '/:id' or "mine" is treated as a booking id.
  r.get('/mine', (req, res) => res.json(bookings.listMine(req.user)));
  r.get('/:id', (req, res) => res.json(bookings.get(req.user, req.params.id)));
  r.post('/:id/pay', (req, res) => res.json(bookings.pay(req.user, req.params.id)));
  r.post('/:id/cancel', (req, res) => res.json(bookings.cancel(req.user, req.params.id)));
  r.post('/:id/reminder', (req, res) => res.json({ reminderSet: bookings.toggleReminder(req.user, req.params.id) }));

  function confirmedOwn(req) {
    const b = bookings.get(req.user, req.params.id);
    if (b.userId !== req.user.id) throw forbidden('Only the ticket holder can view this QR code');
    if (b.status !== 'CONFIRMED') throw bad('QR code is only available for confirmed bookings');
    return b;
  }

  r.get('/:id/qr', wrap(async (req, res) => {
    const b = confirmedOwn(req);
    res.json({ dataUrl: await qr.dataUrl(b.id, b.eventId), token: qr.createToken(b.id, b.eventId), ticketCode: b.ticketCode });
  }));

  r.get('/:id/qr/download', wrap(async (req, res) => {
    const b = confirmedOwn(req);
    res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="ticket-${b.id}.png"` });
    res.send(await qr.png(b.id, b.eventId));
  }));

  return r;
}
