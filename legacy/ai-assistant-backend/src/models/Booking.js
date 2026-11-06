const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    eventTitle: { type: String, required: true },
    eventDate: { type: Date, required: true },
    venue: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    teamName: { type: String, default: '' },
    attendees: { type: [String], default: [] },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['HELD', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
      default: 'HELD',
      index: true,
    },
    holdExpiresAt: { type: Date, required: true, index: true },
    ticketCode: { type: String, default: '' },
    paymentRef: { type: String, default: '' },
    checkedInAt: { type: Date, default: null },
    cancellationPolicy: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);

