import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'node:events';
import { config as defaultConfig } from './config.js';
import { openDb } from './db.js';
import { makeAuth } from './auth.js';
import { makeQr } from './qr.js';
import { HttpError } from './errors.js';
import { makeEventService } from './services/events.js';
import { makeBookingService } from './services/bookings.js';
import { makeAiService } from './services/ai.js';
import { makeWhatsAppClient } from './whatsapp/client.js';
import { makeBot } from './whatsapp/bot.js';
import { makeNotifier } from './whatsapp/notify.js';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { bookingRoutes } from './routes/bookings.js';
import { organizerRoutes } from './routes/organizer.js';
import { wishlistRoutes, certificateRoutes, aiRoutes, scanRoutes } from './routes/misc.js';
import { whatsappRoutes } from './routes/whatsapp.js';
import { adminRoutes } from './routes/admin.js';

/** Build the whole app. Everything is injectable so tests can use an in-memory DB and a fake fetch. */
export function createContext({ config = defaultConfig, db = openDb(config.databasePath), fetchImpl } = {}) {
  const bus = new EventEmitter();
  const qr = makeQr(config.qrSecret);
  const auth = makeAuth({ db, config });
  const events = makeEventService({ db });
  const bookings = makeBookingService({ db, config, qr, bus });
  const ai = makeAiService({ db });
  const client = makeWhatsAppClient({ config, fetchImpl });
  const bot = makeBot({ db, config, client, ai, bookings, qr });
  const notifier = makeNotifier({ db, config, client, bus, qr });
  return { db, config, bus, qr, auth, events, bookings, ai, wa: { client, bot, notifier } };
}

export function createApp(ctx = createContext()) {
  const { config } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors({
    origin(origin, cb) {
      // Allow same-origin / curl (no Origin header) and the configured frontends.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
  }));
  app.use(express.json({
    limit: '200kb',
    verify: (req, _res, buf) => { req.rawBody = buf; }, // needed to verify WhatsApp's HMAC signature
  }));

  app.get('/health', (_req, res) => res.json({ ok: true, whatsapp: ctx.wa.client.enabled() }));

  app.use('/auth', authRoutes(ctx));
  app.use('/events', eventRoutes(ctx));
  app.use('/bookings', bookingRoutes(ctx));
  const org = organizerRoutes(ctx);
  app.use('/organizer', org);
  app.use('/vendor', org);
  app.use('/scan', scanRoutes(ctx));
  app.use('/wishlist', wishlistRoutes(ctx));
  app.use('/certificates', certificateRoutes(ctx));
  app.use('/ai', aiRoutes(ctx));
  app.use('/whatsapp', whatsappRoutes(ctx));
  app.use('/admin', adminRoutes(ctx));

  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, ...err.extra });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
    console.error('[error]', err);
    res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
  });

  return app;
}
