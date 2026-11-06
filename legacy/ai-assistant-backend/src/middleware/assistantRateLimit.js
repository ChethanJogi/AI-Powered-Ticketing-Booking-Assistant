const rateLimit = require('express-rate-limit');

const assistantRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? String(req.user._id) : req.ip;
  },
  handler: (req, res) => {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many assistant requests. Please wait a moment before sending another message.',
    });
  },
});

module.exports = assistantRateLimiter;
