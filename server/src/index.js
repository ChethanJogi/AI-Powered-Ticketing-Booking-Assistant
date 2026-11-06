import { config } from './config.js';
import { createContext, createApp } from './app.js';

if (config.whatsapp.enabled && config.isProd && !config.whatsapp.appSecret) {
  throw new Error('WHATSAPP_APP_SECRET is required in production so webhook signatures can be verified');
}

const ctx = createContext();
const app = createApp(ctx);

app.listen(config.port, () => {
  console.log(`TicketAI API listening on http://localhost:${config.port}`);
  console.log(`WhatsApp: ${ctx.wa.client.enabled() ? 'enabled' : 'disabled'}`);
});

// Housekeeping: expire unpaid holds and send WhatsApp reminders.
setInterval(() => { try { ctx.bookings.sweepExpired(); } catch (e) { console.error(e); } }, 60_000).unref();
setInterval(() => ctx.wa.notifier.sendDueReminders().catch((e) => console.error('[reminders]', e.message)), 15 * 60_000).unref();
