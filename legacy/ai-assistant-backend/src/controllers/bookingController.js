const Booking = require('../models/Booking');
const ticketingAdapter = require('../ai/services/ticketingAdapter');

exports.createBooking = async (req, res) => {
  try {
    const { eventId, qty, teamName, attendees } = req.body;
    const booking = await ticketingAdapter.createBooking({
      eventId,
      user: req.user,
      qty: qty || 1,
      teamName,
      attendees,
    });
    return res.status(201).json(booking);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.payBooking = async (req, res) => {
  try {
    const booking = await ticketingAdapter.confirmPayment(req.params.id, 'sandbox_pay');
    return res.json(booking);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const result = await ticketingAdapter.cancelBooking(req.params.id, req.user);
    return res.json(result.booking);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.getBooking = async (req, res) => {
  try {
    const booking = await ticketingAdapter.getBooking(req.params.id, req.user._id);
    return res.json(booking);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.listMine = async (req, res) => {
  try {
    const bookings = await ticketingAdapter.getUserBookings(req.user._id);
    return res.json(bookings);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

