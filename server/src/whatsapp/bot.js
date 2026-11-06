import { digits } from './client.js';
import { inr, when } from './format.js';

const HELP = `👋 *TicketAI*
Here is what I can do:

• Just ask: _free workshops_, _hackathons in Bengaluru_, _events under 500_
• *BOOK <event id> [tickets]* – hold seats
• *BOOKINGS* – your latest bookings
• *TICKET <booking id>* – get your QR ticket
• *CANCEL <booking id>* – cancel a booking
• *LINK <code>* – connect this number to your account (get the code in Profile → WhatsApp on the website)
• *NOTIFY OFF* / *NOTIFY ON* – ticket & reminder messages
• *UNLINK* – disconnect this number`;

const MAX_LINK_FAILS = 5;

export function makeBot({ db, config, client, ai, bookings, qr }) {
  const fails = new Map(); // waNumber -> { n, reset }

  const userByWa = (wa) => db.prepare('SELECT * FROM users WHERE whatsapp_number = ?').get(wa);
  const link = (id) => `${config.frontendUrl}/bookings/${id}`;
  const eventLink = (id) => `${config.frontendUrl}/events/${id}`;
  const needLink = () =>
    'This number is not linked to a TicketAI account yet.\nOpen *Profile → WhatsApp* on the website, generate a code, then send me: *LINK 123456*';

  const reply = (to, text) => client.sendText(to, text);

  function eventsMessage(result) {
    if (!result.events.length) return result.text;
    const lines = result.events.map(
      (e) => `• *${e.title}*\n  ${when(e.date)} · ${e.venue}, ${e.city}\n  ${inr(e.price)} · id: ${e.id}\n  ${eventLink(e.id)}`
    );
    return `${result.text}\n\n${lines.join('\n\n')}\n\nTo book, reply *BOOK <id>* (e.g. BOOK ${result.events[0].id} 2).`;
  }

  function handleLink(wa, code) {
    const f = fails.get(wa);
    if (f && f.reset > Date.now() && f.n >= MAX_LINK_FAILS) return 'Too many wrong codes. Please wait 15 minutes and try again.';
    const row = db.prepare('SELECT * FROM whatsapp_link_codes WHERE code = ? AND expires_at > ?').get(code, Date.now());
    if (!row) {
      const cur = f && f.reset > Date.now() ? f : { n: 0, reset: Date.now() + 15 * 60_000 };
      cur.n += 1;
      fails.set(wa, cur);
      return 'That code is invalid or has expired. Generate a new one in Profile → WhatsApp.';
    }
    db.prepare('UPDATE users SET whatsapp_number = NULL WHERE whatsapp_number = ?').run(wa); // number moves to this account
    db.prepare('UPDATE users SET whatsapp_number = ?, whatsapp_opt_in = 1 WHERE id = ?').run(wa, row.user_id);
    db.prepare('DELETE FROM whatsapp_link_codes WHERE user_id = ?').run(row.user_id);
    const u = db.prepare('SELECT name FROM users WHERE id = ?').get(row.user_id);
    return `✅ Linked! Hi ${u.name}, you will now get tickets and reminders here. Send *BOOKINGS* to see your bookings.`;
  }

  async function handle(wa, rawText, profileName = '') {
    const text = String(rawText || '').trim();
    const [cmdRaw, ...args] = text.split(/\s+/);
    const cmd = (cmdRaw || '').toLowerCase();
    const user = userByWa(wa);

    // Expire stale pending confirmations.
    db.prepare('DELETE FROM whatsapp_pending WHERE expires_at < ?').run(Date.now());

    if (['yes', 'confirm', 'y'].includes(cmd)) {
      const p = db.prepare('SELECT * FROM whatsapp_pending WHERE wa_number = ?').get(wa);
      if (p && user) {
        db.prepare('DELETE FROM whatsapp_pending WHERE wa_number = ?').run(wa);
        if (p.action === 'cancel') {
          try {
            const b = bookings.cancel(user, JSON.parse(p.payload).id);
            return reply(wa, b.status === 'REFUNDED'
              ? `Booking ${b.id} cancelled. Refund per policy: ${b.cancellationPolicy}.`
              : `Booking ${b.id} cancelled.`);
          } catch (e) { return reply(wa, e.message); }
        }
      }
      return reply(wa, 'Nothing to confirm. Send *HELP* to see what I can do.');
    }
    if (['no', 'n'].includes(cmd)) {
      db.prepare('DELETE FROM whatsapp_pending WHERE wa_number = ?').run(wa);
      return reply(wa, 'Okay, no changes made.');
    }

    switch (cmd) {
      case 'hi': case 'hello': case 'hey': case 'help': case 'menu': case 'start': case 'namaste':
        return reply(wa, `${profileName ? `Hi ${profileName}! ` : ''}${HELP}`);

      case 'link':
        return reply(wa, args[0] ? handleLink(wa, args[0]) : 'Send *LINK <code>* with the 6-digit code from the website.');

      case 'unlink':
        if (!user) return reply(wa, 'This number is not linked.');
        db.prepare('UPDATE users SET whatsapp_number = NULL WHERE id = ?').run(user.id);
        return reply(wa, 'Unlinked. You can link again any time from your Profile.');

      case 'notify': {
        if (!user) return reply(wa, needLink());
        const on = (args[0] || '').toLowerCase() !== 'off';
        db.prepare('UPDATE users SET whatsapp_opt_in = ? WHERE id = ?').run(on ? 1 : 0, user.id);
        return reply(wa, on ? 'Ticket and reminder messages are ON.' : 'Ticket and reminder messages are OFF. You can still ask me for tickets any time.');
      }

      case 'bookings': case 'mybookings': case 'tickets': {
        if (!user) return reply(wa, needLink());
        const list = bookings.listMine(user).filter((b) => ['CONFIRMED', 'HELD'].includes(b.status)).slice(0, 5);
        if (!list.length) return reply(wa, 'You have no active bookings. Ask me for events, e.g. _free workshops_.');
        return reply(wa, '🎟️ *Your bookings*\n\n' + list.map((b) =>
          `• *${b.eventTitle}* (${b.status})\n  ${when(b.eventDate)} · ${b.qty} ticket${b.qty > 1 ? 's' : ''}\n  id: ${b.id}` +
          (b.status === 'HELD' ? `\n  Pay before it expires: ${link(b.id)}` : `\n  Send *TICKET ${b.id}* for the QR`)
        ).join('\n\n'));
      }

      case 'ticket': {
        if (!user) return reply(wa, needLink());
        if (!args[0]) return reply(wa, 'Send *TICKET <booking id>*.');
        let b;
        try { b = bookings.get(user, args[0].toUpperCase()); } catch (e) { return reply(wa, e.message); }
        if (b.userId !== user.id) return reply(wa, 'That booking belongs to another account.');
        if (b.status !== 'CONFIRMED') return reply(wa, `That booking is ${b.status}, so there is no ticket yet.${b.status === 'HELD' ? ' Pay here: ' + link(b.id) : ''}`);
        await client.sendImage(wa, await qr.png(b.id, b.eventId), `${b.eventTitle}\n${when(b.eventDate)} · ${b.venue}\nCode: ${b.ticketCode}`);
        return;
      }

      case 'book': {
        if (!user) return reply(wa, needLink());
        const eventId = args[0];
        if (!eventId) return reply(wa, 'Send *BOOK <event id> [tickets]*, e.g. BOOK ws_genai 2');
        const qty = Math.max(1, Math.min(10, parseInt(args[1] || '1', 10) || 1));
        try {
          const b = bookings.create(user, { eventId, qty });
          return reply(wa,
            `🎫 Seats held for *${b.eventTitle}*\n${qty} ticket${qty > 1 ? 's' : ''} · ${inr(b.amount)}\n\n` +
            `Complete payment within ${config.holdMinutes} minutes:\n${link(b.id)}\n\nYour QR ticket will be sent here once payment is confirmed.`);
        } catch (e) { return reply(wa, e.message); }
      }

      case 'cancel': {
        if (!user) return reply(wa, needLink());
        if (!args[0]) return reply(wa, 'Send *CANCEL <booking id>*.');
        const id = args[0].toUpperCase();
        let b;
        try { b = bookings.get(user, id); } catch (e) { return reply(wa, e.message); }
        if (b.userId !== user.id) return reply(wa, 'That booking belongs to another account.');
        if (!['HELD', 'CONFIRMED'].includes(b.status)) return reply(wa, `That booking is ${b.status} and cannot be cancelled.`);
        db.prepare('INSERT OR REPLACE INTO whatsapp_pending (wa_number,action,payload,expires_at) VALUES (?,?,?,?)')
          .run(wa, 'cancel', JSON.stringify({ id }), Date.now() + 5 * 60_000);
        return reply(wa, `Cancel *${b.eventTitle}* (${b.id})?\nPolicy: ${b.cancellationPolicy}\n\nReply *YES* to confirm or *NO* to keep it.`);
      }

      default: {
        if (!text) return reply(wa, HELP);
        return reply(wa, eventsMessage(ai.chat(text, { userId: user?.id })));
      }
    }
  }

  /** Entry point for a parsed Cloud API webhook payload. Returns the number of messages processed. */
  async function processWebhook(payload) {
    let n = 0;
    for (const entry of payload?.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        for (const m of v.messages || []) {
          const claimed = db.prepare('INSERT OR IGNORE INTO whatsapp_messages (message_id, received_at) VALUES (?, ?)').run(m.id, Date.now());
          if (claimed.changes === 0) continue; // Meta retries deliveries - ignore duplicates
          const wa = digits(m.from);
          const name = v.contacts?.find((c) => digits(c.wa_id) === wa)?.profile?.name || '';
          try {
            if (m.type === 'text') await handle(wa, m.text?.body || '', name);
            else if (m.type === 'button') await handle(wa, m.button?.text || '', name);
            else if (m.type === 'interactive') await handle(wa, m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '', name);
            else await reply(wa, 'I can only read text messages for now. Send *HELP* to see what I can do.');
            n += 1;
          } catch (e) {
            console.error('[whatsapp] failed to handle message', m.id, e.message);
          }
        }
      }
    }
    db.prepare('DELETE FROM whatsapp_messages WHERE received_at < ?').run(Date.now() - 2 * 86400000);
    return n;
  }

  return { handle, processWebhook };
}
