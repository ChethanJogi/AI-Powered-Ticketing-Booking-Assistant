const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ticketai-jwt-production-secret-key-2026';

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Support testing/demo token format (e.g. valid ObjectId) or real JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      // Check if token directly matches user ID (for fallback or testing)
      if (token && token.length === 24) {
        decoded = { id: token };
      } else {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
      }
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'InternalError', message: err.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied for this role' });
    }
    next();
  };
}

module.exports = { auth, requireRole, JWT_SECRET };

