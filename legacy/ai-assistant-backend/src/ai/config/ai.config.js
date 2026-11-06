require('dotenv').config();

const aiConfig = Object.freeze({
  provider: process.env.AI_PROVIDER || 'mock',
  model: process.env.AI_MODEL || 'ticketai-gpt-4o',
  apiKey: process.env.AI_API_KEY || '',
  timeoutMs: parseInt(process.env.AI_TIMEOUT, 10) || 15000,
  maxToolCalls: parseInt(process.env.AI_MAX_TOOL_CALLS, 10) || 5,
  rateLimitMax: parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 30,
  actionExpiryMinutes: parseInt(process.env.ACTION_EXPIRY_MINUTES, 10) || 10,
  actionSecret: process.env.ACTION_SECRET || 'ticketai-action-signing-secret-key-2026',
});

module.exports = aiConfig;
