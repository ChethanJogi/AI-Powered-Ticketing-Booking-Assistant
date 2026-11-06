const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Music', 'Comedy', 'Conference', 'Culture', 'College Technical', 'Workshop', 'Museum'],
    },
    eventType: { type: String, default: '' },
    college: { type: String, default: '' },
    branch: { type: String, default: 'All Branches' },
    city: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    price: { type: Number, required: true, default: 0, min: 0 },
    capacity: { type: Number, required: true, default: 100, min: 1 },
    description: { type: String, default: '' },
    instructor: { type: String, default: '' },
    duration: { type: String, default: '' },
    topics: { type: [String], default: [] },
    certificateAvailable: { type: Boolean, default: false },
    openingHours: { type: String, default: '' },
    visitorInfo: { type: [String], default: [] },
    rulesUrl: { type: String, default: '' },
    teamSize: { type: String, default: '1' },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posterUrl: { type: String, default: '' },
    cancellationPolicy: {
      type: String,
      default: 'Free cancellation up to 24 hours before the event',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);

