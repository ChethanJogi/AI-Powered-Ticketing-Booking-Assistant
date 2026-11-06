const express = require('express');
const cors = require('cors');
const errorMapper = require('./ai/errors/errorMapper');

// Routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const assistantRoutes = require('./routes/assistantRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Core API Routes (both prefixed and root for maximum frontend compatibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/bookings', bookingRoutes);

// AI Assistant Routes
app.use('/api/assistant', assistantRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handling
app.use(errorMapper);

module.exports = app;

