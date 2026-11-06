import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
const bool = (v) => String(v || '').toLowerCase() === 'true';

function secret(name, devFallback) {
  const v = process.env[name];
  if (v && v.length >= 16 && !v.startsWith('change-me')) return v;
  if (isProd) throw new Error(`${name} must be set to a long random value in production`);
  console.warn(`[config] ${name} not set - using an insecure development default`);
  return devFallback;
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 8000),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  databasePath: process.env.DATABASE_PATH || './data/ticketai.db',
  jwtSecret: secret('JWT_SECRET', 'dev-only-jwt-secret-do-not-use-in-prod'),
  qrSecret: secret('QR_SECRET', 'dev-only-qr-secret-do-not-use-in-prod'),
  holdMinutes: 10,
  whatsapp: {
    enabled: bool(process.env.WHATSAPP_ENABLED),
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    publicNumber: (process.env.WHATSAPP_PUBLIC_NUMBER || '').replace(/\D/g, ''),
    template: process.env.WHATSAPP_TEMPLATE_BOOKING || '',
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
  },
};
