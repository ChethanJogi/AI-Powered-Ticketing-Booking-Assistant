const Event = require('../../models/Event');
const Booking = require('../../models/Booking');
const AssistantError = require('../errors/AssistantError');
const crypto = require('crypto');

class TicketingAdapter {
  async getEvent(eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new AssistantError('EVENT_NOT_FOUND', `Event with ID ${eventId} was not found.`, null, 404);
    }
    return event;
  }

  async checkSeats(eventId) {
    const event = await this.getEvent(eventId);
    const now = new Date();

    // Sum active bookings: confirmed or unexpired held
    const activeBookings = await Booking.find({
      eventId: event._id,
      $or: [
        { status: 'CONFIRMED' },
        { status: 'HELD', holdExpiresAt: { $gt: now } },
      ],
    });

    const bookedSeats = activeBookings.reduce((sum, b) => sum + (b.qty || 0), 0);
    const seatsLeft = Math.max(0, event.capacity - bookedSeats);

    return {
      eventId: String(event._id),
      title: event.title,
      category: event.category,
      date: event.date,
      venue: event.venue,
      city: event.city,
      price: event.price,
      capacity: event.capacity,
      bookedSeats,
      seatsLeft,
      isSoldOut: seatsLeft === 0,
      cancellationPolicy: event.cancellationPolicy,
    };
  }

  async getUserBookings(userId) {
    return Booking.find({ userId }).sort({ createdAt: -1 });
  }

  async getBooking(bookingId, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AssistantError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found.`, null, 404);
    }

    if (userId && String(booking.userId) !== String(userId)) {
      throw new AssistantError('FORBIDDEN', 'You do not have access to view this booking.', null, 403);
    }

    return booking;
  }

  async createBooking({ eventId, user, qty = 1, teamName = '', attendees = [] }) {
    const availability = await this.checkSeats(eventId);
    if (qty > availability.seatsLeft) {
      throw new AssistantError(
        'INSUFFICIENT_SEATS',
        availability.seatsLeft === 0
          ? 'Event is completely sold out.'
          : `Only ${availability.seatsLeft} seat(s) remain.`
      );
    }

    const event = await this.getEvent(eventId);
    const holdMinutes = 10;
    const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
    const totalAmount = qty * event.price;

    const booking = await Booking.create({
      eventId: event._id,
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      qty,
      teamName,
      attendees,
      amount: totalAmount,
      status: 'HELD',
      holdExpiresAt,
      cancellationPolicy: event.cancellationPolicy,
      idempotencyKey: `idem_${crypto.randomBytes(8).toString('hex')}`,
    });

    return booking;
  }

  async confirmPayment(bookingId, paymentRef = 'verified_pay') {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AssistantError('BOOKING_NOT_FOUND', 'Booking not found.', null, 404);
    }

    booking.status = 'CONFIRMED';
    booking.paymentRef = paymentRef;
    booking.ticketCode = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await booking.save();

    return booking;
  }

  async cancelBooking(bookingId, user) {
    const booking = await this.getBooking(bookingId, user._id);
    if (booking.status !== 'CONFIRMED' && booking.status !== 'HELD') {
      throw new AssistantError(
        'INVALID_STATUS',
        `Booking with status ${booking.status} cannot be cancelled.`
      );
    }

    const previousStatus = booking.status;
    booking.status = previousStatus === 'CONFIRMED' ? 'REFUNDED' : 'CANCELLED';
    booking.cancelledAt = new Date();
    await booking.save();

    return {
      booking,
      refundStatus: previousStatus === 'CONFIRMED' ? 'REFUND_ISSUED' : 'SEATS_RELEASED',
      policy: booking.cancellationPolicy,
    };
  }
}

module.exports = new TicketingAdapter();

