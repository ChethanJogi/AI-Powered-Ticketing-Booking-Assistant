const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ticketai';

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB Connected Successfully]');
  } catch (err) {
    console.warn('[MongoDB Connection Warning]: Could not connect to MongoDB server:', err.message);
  }
}

module.exports = connectDB;

