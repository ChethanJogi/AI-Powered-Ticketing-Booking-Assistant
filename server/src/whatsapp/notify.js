import { inr, when } from './format.js';

/**
 * Outbound WhatsApp messages: ticket on payment, refund note on cancellation, 24h reminders.
 * Failures are logged and never bubble up to the API caller.
 */
export function makeNotifier({ db, config, client, bus, qr }) {
  const userWa = (id) => {
    const u = db.prepare('SELECT whatsapp_number, whatsapp_opt_in, name FROM users WHERE id = ?').get(id);
    return u && u.whatsapp_number && u.whatsapp_opt_in ? u : null;
  };
  const link = (id) => `${config.frontendUrl}/bookings/${id}`;

  /** Free-form text works inside the 24h customer-service window; outside it Meta needs a template. */
  async function sendSmart(to, text, templateParams) {
    try {
      await client.sendText(to, text);
      return true;
    } catch (e) {
      const outsideWindow = e.code === 131047 || e.code === 131026;
      if (outsideWindow && config.whatsapp.template) {
        await client.sendTemplate(to, config.whatsapp.template, config.whatsapp.templateLang, templateParams);
        return false; // window closed: no free-form image either
      }
      throw e;
    }
  }

  async function ticketConfirmed(b) {
    const u = userWa(b.user_id);
    if (!client.enabled() || !u) return;
    const text =
      `✅ *Booking confirmed*\n${b.event_title}\n${when(b.event_date)} · ${b.venue}\n` +
      `${b.qty} ticket${b.qty > 1 ? 's' : ''} · ${inr(b.amount)}\nBooking: ${b.id} · Code: ${b.ticket_code}\n${link(b.id)}`;
    const inWindow = await sendSmart(u.whatsapp_number, text, [b.event_title, when(b.event_date), b.id]);
    if (inWindow) await client.sendImage(u.whatsapp_number, await qr.png(b.id, b.event_id), 'Show this QR at the entrance');
  }

  async function refunded(b) {
    const u = userWa(b.user_id);
    if (!client.enabled() || !u || b.status !== 'REFUNDED') return;
    await sendSmart(u.whatsapp_number, `↩️ Booking ${b.id} for *${b.event_title}* was cancelled. Refund per policy: ${b.cancellation_policy}.`, [b.event_title, when(b.event_date), b.id]);
  }

  const safe = (fn) => (b) => fn(b).catch((e) => console.error('[whatsapp] notification failed:', e.message));
  bus.on('booking.confirmed', safe(ticketConfirmed));
  bus.on('booking.cancelled', safe(refunded));

  /** Send reminders (once) for confirmed bookings starting within 24h where the user switched reminders on. */
  async function sendDueReminders(now = Date.now()) {
    if (!client.enabled()) return 0;
    const rows = db.prepare(`SELECT * FROM bookings WHERE status = 'CONFIRMED' AND reminder_set = 1 AND reminded_at IS NULL`).all();
    let sent = 0;
    for (const b of rows) {
      const t = new Date(b.event_date).getTime();
      if (!(t > now && t - now <= 24 * 3600_000)) continue;
      const u = userWa(b.user_id);
      if (!u) continue;
      try {
        await sendSmart(u.whatsapp_number, `⏰ *Reminder*: ${b.event_title} starts ${when(b.event_date)} at ${b.venue}.\nTicket: ${link(b.id)}`, [b.event_title, when(b.event_date), b.id]);
        db.prepare('UPDATE bookings SET reminded_at = ? WHERE id = ?').run(now, b.id);
        sent += 1;
      } catch (e) {
        console.error('[whatsapp] reminder failed:', e.message);
      }
    }
    return sent;
  }

  return { ticketConfirmed, refunded, sendDueReminders };
}
