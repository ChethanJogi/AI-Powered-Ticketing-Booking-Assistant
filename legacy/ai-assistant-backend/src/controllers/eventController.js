const Event = require('../models/Event');
const ticketingAdapter = require('../ai/services/ticketingAdapter');

exports.listEvents = async (req, res) => {
  try {
    const { q, category, event_type, city, college } = req.query;
    const filter = {};

    if (category && category !== 'All') filter.category = category;
    if (event_type && event_type !== 'All') filter.eventType = event_type;
    if (city && city !== 'All') filter.city = city;
    if (college && college !== 'All') filter.college = college;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
      ];
    }

    const events = await Event.find(filter).sort({ date: 1 });
    return res.json(events);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.json(event);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const availability = await ticketingAdapter.checkSeats(req.params.id);
    return res.json(availability);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }
};

exports.listCities = async (req, res) => {
  try {
    const cities = await Event.distinct('city');
    return res.json(cities);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizerId: req.user._id,
    });
    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

