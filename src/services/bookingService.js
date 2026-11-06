import { USE_MOCK, request, db, uid } from './apiClient.js';
import { eventService } from './eventService.js';
import { certificateService } from './certificateService.js';

// Booking life-cycle: HELD -> CONFIRMED -> REFUNDED or HELD -> EXPIRED / CANCELLED
const HOLD_MINUTES = 10;
const read = () => db.get('bookings', []);
const write = (list) => db.set('bookings', list);

function sweep(list) {
  const now = Date.now();
  let changed = false;
  list.forEach((b) => {
    if (b.status === 'HELD' && b.holdExpiresAt < now) {
      b.status = 'EXPIRED';
      changed = true;
    }
  });
  if (changed) write(list);
  return list;
}

const isActive = (b) => b.status === 'HELD' || b.status === 'CONFIRMED';

export const bookingService = {
  async seatsLeft(eventId) {
    if (!USE_MOCK) return (await request(`/events/${eventId}/availability`)).seatsLeft;
    const ev = await eventService.get(eventId);
    const used = sweep(read())
      .filter((b) => b.eventId === eventId && isActive(b))
      .reduce((s, b) => s + b.qty, 0);
    return Math.max(0, ev.capacity - used);
  },

  async create({ eventId, qty, user, idempotencyKey, teamName = '', attendees = [] }) {
    if (!USE_MOCK) {
      return request('/bookings', {
        method: 'POST',
        body: { eventId, qty, idempotencyKey, teamName, attendees },
      });
    }

    const list = sweep(read());
    const dup =
      list.find((b) => b.idempotencyKey === idempotencyKey) ||
      list.find((b) => b.userId === user.id && b.eventId === eventId && b.status === 'HELD');
    if (dup) return dup;

    const ev = await eventService.get(eventId);
    const left = await bookingService.seatsLeft(eventId);
    if (qty < 1) throw new Error('Choose at least 1 ticket');
    if (qty > left) throw new Error(left === 0 ? 'Sold out' : `Only ${left} tickets left`);

    const b = {
      id: uid('BK'),
      eventId,
      eventTitle: ev.title,
      eventDate: ev.date,
      venue: ev.venue,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      qty,
      teamName,
      attendees,
      amount: qty * ev.price,
      status: 'HELD',
      holdExpiresAt: Date.now() + HOLD_MINUTES * 60000,
      createdAt: Date.now(),
      idempotencyKey,
      vendorId: ev.vendorId,
      cancellationPolicy: ev.cancellationPolicy || 'Free cancellation up to 24 hours before the event',
      reminderSet: false,
      checkedInAt: null,
    };
    write([b, ...list]);
    return b;
  },

  async pay(id) {
    if (!USE_MOCK) return request(`/bookings/${id}/pay`, { method: 'POST' });
    const list = sweep(read());
    const b = list.find((x) => x.id === id);
    if (!b) throw new Error('Booking not found');
    if (b.status === 'EXPIRED') throw new Error('Your hold expired. Please book again.');
    if (b.status !== 'HELD') throw new Error('This booking cannot be paid');

    b.status = 'CONFIRMED';
    b.paymentRef = uid('pay');
    b.ticketCode = 'TKT-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    // Auto issue certificate if event provides certificate
    const ev = await eventService.get(b.eventId).catch(() => null);
    if (ev && ev.certificateAvailable) {
      certificateService.issue(b.userId, b.userName, ev.id, ev.title, b.id);
    }

    write(list);
    return b;
  },

  async cancel(id) {
    if (!USE_MOCK) return request(`/bookings/${id}/cancel`, { method: 'POST' });
    const list = sweep(read());
    const b = list.find((x) => x.id === id);
    if (!b) throw new Error('Booking not found');
    if (b.status === 'CONFIRMED') b.status = 'REFUNDED';
    else if (b.status === 'HELD') b.status = 'CANCELLED';
    else throw new Error('This booking cannot be cancelled');
    b.cancelledAt = Date.now();
    write(list);
    return b;
  },

  async toggleReminder(id) {
    if (!USE_MOCK) return (await request(`/bookings/${id}/reminder`, { method: 'POST' })).reminderSet;
    const list = read();
    const b = list.find((x) => x.id === id);
    if (!b) throw new Error('Booking not found');
    b.reminderSet = !b.reminderSet;
    write(list);
    return b.reminderSet;
  },

  async get(id) {
    if (!USE_MOCK) return request('/bookings/' + id);
    const b = sweep(read()).find((x) => x.id === id);
    if (!b) throw new Error('Booking not found');
    return b;
  },

  async listMine(userId) {
    if (!USE_MOCK) return request('/bookings/mine');
    return sweep(read()).filter((b) => b.userId === userId);
  },

  async listForEvent(eventId) {
    if (!USE_MOCK) return request(`/organizer/events/${eventId}/participants`);
    return sweep(read()).filter((b) => b.eventId === eventId);
  },

  async listForVendor(vendorId) {
    if (!USE_MOCK) return request('/organizer/bookings');
    return sweep(read()).filter((b) => b.vendorId === vendorId || vendorId === 'u_organizer');
  },
};
