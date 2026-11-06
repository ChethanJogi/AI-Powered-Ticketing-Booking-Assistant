// Run with: npm test   (uses an in-memory DB and a fake fetch - no network, no real WhatsApp)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { openDb } from '../src/db.js';
import { makeQr } from '../src/qr.js';
import { makeEventService } from '../src/services/events.js';
import { makeBookingService } from '../src/services/bookings.js';
import { makeAiService } from '../src/services/ai.js';
import { makeWhatsAppClient } from '../src/whatsapp/client.js';
import { makeBot } from '../src/whatsapp/bot.js';
import { makeNotifier } from '../src/whatsapp/notify.js';

function setup({ waEnabled = true } = {}) {
  const config = {
    isProd: false, holdMinutes: 10, frontendUrl: 'http://fe.test', qrSecret: 'test-qr-secret-0123456789',
    whatsapp: { enabled: waEnabled, token: 't', phoneNumberId: '123', apiVersion: 'v21.0', template: '', templateLang: 'en', appSecret: '', verifyToken: 'v', publicNumber: '' },
  };
  const sent = [];
  const fetchImpl = async (url, init) => {
    const isMedia = String(url).endsWith('/media');
    sent.push({ url: String(url), body: isMedia ? 'media' : JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => (isMedia ? { id: 'media1' } : { messages: [{ id: 'x' }] }) };
  };
  const db = openDb(':memory:');
  const bus = new EventEmitter();
  const qr = makeQr(config.qrSecret);
  const events = makeEventService({ db });
  const bookings = makeBookingService({ db, config, qr, bus });
  const ai = makeAiService({ db });
  const client = makeWhatsAppClient({ config, fetchImpl });
  const bot = makeBot({ db, config, client, ai, bookings, qr });
  const notifier = makeNotifier({ db, config, client, bus, qr });
  const user = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return { db, config, bus, qr, events, bookings, ai, client, bot, notifier, sent, user };
}

const texts = (sent) => sent.filter((s) => s.body?.text).map((s) => s.body.text.body);

test('seed data loads and filters work', () => {
  const { events } = setup();
  assert.equal(events.list().length, 26);
  assert.ok(events.list({ category: 'Workshop' }).every((e) => e.category === 'Workshop'));
  assert.ok(events.list({ free_only: 'true' }).every((e) => e.price === 0));
  assert.ok(events.list({ event_type: 'Hackathons' }).length >= 1);
  assert.ok(events.list({ q: 'rust' }).some((e) => e.id === 'ws_python_rust'));
  const e = events.get('tech_hackindia');
  assert.equal(e.certificateAvailable, true);
  assert.ok(e.eventType && e.teamSize && e.prizePool); // camelCase contract used by the frontend
  assert.deepEqual(events.distinct('city').includes('Bengaluru'), true);
});

test('booking lifecycle: hold -> pay -> QR scan -> duplicate scan rejected', () => {
  const { bookings, user, qr, db } = setup();
  const demo = user('u_demo');
  const organizer = user('u_organizer');

  const b = bookings.create(demo, { eventId: 'tech_hackindia', qty: 2, idempotencyKey: 'k1' });
  assert.equal(b.status, 'HELD');
  assert.equal(b.amount, 0);
  assert.equal(bookings.create(demo, { eventId: 'tech_hackindia', qty: 2, idempotencyKey: 'k1' }).id, b.id, 'idempotent');
  assert.equal(bookings.seatsLeft('tech_hackindia').seatsLeft, 298);

  const paid = bookings.pay(demo, b.id);
  assert.equal(paid.status, 'CONFIRMED');
  assert.match(paid.ticketCode, /^TKT-/);
  assert.ok(paid.ticketToken, 'owner receives signed token');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM certificates WHERE user_id = ?').get('u_demo').n, 1);

  // Wrong event / forged token / other organizer
  assert.equal(bookings.scan(organizer, paid.ticketToken, 'ev_neon').code, 'WRONG_EVENT');
  assert.equal(bookings.scan(organizer, paid.ticketToken.slice(0, -2) + 'xx').code, 'TAMPERED');
  assert.equal(bookings.scan(user('u_vendor'), paid.ticketToken).code, 'NOT_YOUR_EVENT');

  const ok = bookings.scan(organizer, paid.ticketToken);
  assert.equal(ok.valid, true);
  assert.equal(ok.code, 'CHECKED_IN');
  const again = bookings.scan(organizer, paid.ticketToken);
  assert.equal(again.valid, false);
  assert.equal(again.code, 'ALREADY_USED');
  assert.throws(() => bookings.cancel(demo, b.id), /already been used/);
  assert.equal(qr.verifyToken(paid.ticketToken).valid, true);
});

test('access control: other users cannot see/pay/cancel; organizers only see own events', () => {
  const { bookings, user } = setup();
  const b = bookings.create(user('u_demo'), { eventId: 'ev_neon', qty: 1 });
  const stranger = { ...user('u_demo'), id: 'u_other', email: 'o@x.in' };
  assert.throws(() => bookings.get(stranger, b.id), /another account/);
  assert.throws(() => bookings.pay(stranger, b.id), /another account/);
  assert.throws(() => bookings.cancel(stranger, b.id), /another account/);
  // neon belongs to u_vendor: vendor may view it, organizer may not list its participants
  assert.equal(bookings.get(user('u_vendor'), b.id).id, b.id);
  assert.throws(() => bookings.listForEvent(user('u_organizer'), 'ev_neon'), /own events/);
  assert.equal(bookings.listForEvent(user('u_vendor'), 'ev_neon').length, 1);
});

test('capacity, expiry and refund rules', () => {
  const { bookings, user, db } = setup();
  const demo = user('u_demo');
  db.prepare('UPDATE events SET capacity = 3 WHERE id = ?').run('ev_standup');
  assert.throws(() => bookings.create(demo, { eventId: 'ev_standup', qty: 4 }), /Only 3/);
  assert.throws(() => bookings.create(demo, { eventId: 'ev_standup', qty: 11 }), /at most 10/);
  const b = bookings.create(demo, { eventId: 'ev_standup', qty: 3 });
  assert.throws(() => bookings.create({ ...demo, id: 'u_vendor', email: 'v' }, { eventId: 'ev_standup', qty: 1 }), /Sold out/);

  db.prepare('UPDATE bookings SET hold_expires_at = ? WHERE id = ?').run(Date.now() - 1, b.id);
  assert.equal(bookings.get(demo, b.id).status, 'EXPIRED');
  assert.throws(() => bookings.pay(demo, b.id), /expired/);
  assert.equal(bookings.seatsLeft('ev_standup').seatsLeft, 3, 'expired hold frees seats');

  const b2 = bookings.create(demo, { eventId: 'ev_standup', qty: 1 });
  assert.equal(bookings.pay(demo, b2.id).amount, 599);
  assert.equal(bookings.cancel(demo, b2.id).status, 'REFUNDED');
  assert.throws(() => bookings.cancel(demo, b2.id), /cannot be cancelled/);

  db.prepare("UPDATE events SET date = '2020-01-01T10:00' WHERE id = 'ev_classical'").run();
  assert.throws(() => bookings.create(demo, { eventId: 'ev_classical', qty: 1 }), /already taken place/);
});

test('organizer event CRUD validates and enforces ownership', () => {
  const { events, bookings, user } = setup();
  const org = user('u_organizer');
  assert.throws(() => events.create(org, { title: 'x', category: 'Nope', venue: 'v', date: '2027-01-01T10:00' }), /category/);
  const e = events.create(org, { title: 'My Hack', category: 'College Technical', eventType: 'Hackathons', venue: 'Hall', city: 'Mysuru', date: '2027-02-01T10:00', price: '100', capacity: '50' });
  assert.equal(e.vendorId, org.id);
  assert.equal(e.price, 100);
  assert.throws(() => events.update(user('u_vendor'), e.id, { title: 'hijack' }), /only manage events you created/);
  assert.equal(events.update(org, e.id, { title: 'My Hack 2' }).title, 'My Hack 2');
  assert.equal(events.update(org, e.id, { title: 'My Hack 2' }).price, 100, 'PUT merges, keeps price');
  const b = bookings.create(user('u_demo'), { eventId: e.id, qty: 5 });
  assert.throws(() => events.update(org, e.id, { capacity: 3 }), /already booked/);
  bookings.pay(user('u_demo'), b.id);
  assert.throws(() => events.remove(org, e.id), /confirmed booking/);
  assert.equal(events.listOwned(org).some((x) => x.id === e.id), true);
});

test('AI assistant answers from live data', () => {
  const { ai } = setup();
  assert.ok(ai.chat('free workshops').events.every((e) => e.category === 'Workshop' && e.price === 0));
  assert.ok(ai.chat('hackathons for engineering students').events.length > 0);
  assert.ok(ai.chat('events in Bangalore').events.every((e) => e.city === 'Bengaluru'));
  assert.ok(ai.chat('anything under 100').events.every((e) => e.price <= 100));
  assert.ok(ai.chat('how do I cancel').text.includes('10 minutes'));
  assert.ok(ai.chat('zzzz').events.length > 0);
});

test('WhatsApp: link code, search, book, ticket image, cancel confirm, notify opt-out', async () => {
  const { bot, db, sent, user, bookings } = setup();
  const WA = '919876543210';

  await bot.handle(WA, 'bookings');
  assert.match(texts(sent).at(-1), /not linked/);

  await bot.handle(WA, 'LINK 000000');
  assert.match(texts(sent).at(-1), /invalid or has expired/);

  db.prepare('INSERT INTO whatsapp_link_codes (code,user_id,expires_at) VALUES (?,?,?)').run('123456', 'u_demo', Date.now() + 60000);
  await bot.handle(WA, 'link 123456');
  assert.match(texts(sent).at(-1), /Linked/);
  assert.equal(user('u_demo').whatsapp_number, WA);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM whatsapp_link_codes').get().n, 0, 'code is single-use');

  await bot.handle(WA, 'free workshops');
  assert.match(texts(sent).at(-1), /ws_webdev/);

  await bot.handle(WA, 'BOOK ws_webdev 2');
  const held = bookings.listMine(user('u_demo')).find((b) => b.eventId === 'ws_webdev');
  assert.equal(held.status, 'HELD');
  assert.match(texts(sent).at(-1), new RegExp(`/bookings/${held.id}`));

  // paying elsewhere triggers the notifier (ticket text + QR image)
  bookings.pay(user('u_demo'), held.id);
  await new Promise((r) => setTimeout(r, 250));
  assert.ok(sent.some((s) => s.body?.type === 'image'), 'QR image sent on confirmation');

  const before = sent.length;
  await bot.handle(WA, `ticket ${held.id}`);
  assert.ok(sent.slice(before).some((s) => s.body?.type === 'image'));

  await bot.handle(WA, `cancel ${held.id}`);
  assert.match(texts(sent).at(-1), /Reply \*YES\*/);
  assert.equal(bookings.get(user('u_demo'), held.id).status, 'CONFIRMED', 'not cancelled before YES');
  await bot.handle(WA, 'yes');
  assert.equal(bookings.get(user('u_demo'), held.id).status, 'REFUNDED');

  await bot.handle(WA, 'notify off');
  assert.equal(user('u_demo').whatsapp_opt_in, 0);
  const n = sent.length;
  const b2 = bookings.create(user('u_demo'), { eventId: 'ws_webdev', qty: 1 });
  bookings.pay(user('u_demo'), b2.id);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(sent.length, n, 'no notification when opted out');
});

test('WhatsApp: webhook dedupes retries, rejects brute-force link guesses, other users cannot be impersonated', async () => {
  const { bot, db, sent } = setup();
  const payload = (id, from, body) => ({ entry: [{ changes: [{ value: { contacts: [{ wa_id: from, profile: { name: 'Asha' } }], messages: [{ id, from, type: 'text', text: { body } }] } }] }] });
  assert.equal(await bot.processWebhook(payload('wamid.1', '911111111111', 'hi')), 1);
  assert.equal(await bot.processWebhook(payload('wamid.1', '911111111111', 'hi')), 0, 'retry ignored');
  assert.match(texts(sent).at(-1), /Hi Asha/);

  for (let i = 0; i < 5; i++) await bot.handle('912222222222', 'link 11111' + i);
  db.prepare('INSERT INTO whatsapp_link_codes (code,user_id,expires_at) VALUES (?,?,?)').run('999999', 'u_demo', Date.now() + 60000);
  await bot.handle('912222222222', 'link 999999');
  assert.match(texts(sent).at(-1), /Too many wrong codes/);
  assert.equal(db.prepare('SELECT whatsapp_number FROM users WHERE id = ?').get('u_demo').whatsapp_number, null);
});

test('WhatsApp reminders are sent once, only inside 24h, only if requested', async () => {
  const { notifier, bookings, db, user, sent } = setup();
  db.prepare("UPDATE users SET whatsapp_number = '919876543210' WHERE id = 'u_demo'").run();
  const demo = user('u_demo');
  const b = bookings.create(demo, { eventId: 'ev_standup', qty: 1 });
  bookings.pay(demo, b.id);
  await new Promise((r) => setTimeout(r, 250));
  const t5 = new Date(Date.now() + 5 * 3600_000);
  const p2 = (n) => String(n).padStart(2, '0');
  // Event dates are local wall-clock strings, so build the string in local time (not UTC).
  const soon = `${t5.getFullYear()}-${p2(t5.getMonth() + 1)}-${p2(t5.getDate())}T${p2(t5.getHours())}:${p2(t5.getMinutes())}`;
  db.prepare('UPDATE events SET date = ? WHERE id = ?').run(soon, 'ev_standup');
  db.prepare('UPDATE bookings SET event_date = ? WHERE id = ?').run(soon, b.id);

  assert.equal(await notifier.sendDueReminders(), 0, 'reminder not requested');
  bookings.toggleReminder(demo, b.id);
  assert.equal(await notifier.sendDueReminders(), 1);
  assert.equal(await notifier.sendDueReminders(), 0, 'only once');
  assert.ok(texts(sent).some((t) => t.includes('Reminder')));
});

test('WhatsApp client surfaces API errors and falls back to a template outside the 24h window', async () => {
  const { config } = setup();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body.type);
    if (body.type === 'text') return { ok: false, status: 400, json: async () => ({ error: { code: 131047, message: 'Re-engagement message' } }) };
    return { ok: true, status: 200, json: async () => ({}) };
  };
  const cfg = { ...config, whatsapp: { ...config.whatsapp, template: 'booking_confirmed' } };
  const db = openDb(':memory:');
  db.prepare("UPDATE users SET whatsapp_number = '919876543210' WHERE id = 'u_demo'").run();
  const bus = new EventEmitter();
  const qr = makeQr(cfg.qrSecret);
  const client = makeWhatsAppClient({ config: cfg, fetchImpl });
  const bookings = makeBookingService({ db, config: cfg, qr, bus });
  const notifier = makeNotifier({ db, config: cfg, client, bus, qr });
  const demo = db.prepare('SELECT * FROM users WHERE id = ?').get('u_demo');
  const b = bookings.create(demo, { eventId: 'ev_standup', qty: 1 });
  bookings.pay(demo, b.id);
  await new Promise((r) => setTimeout(r, 250));
  assert.deepEqual(calls, ['text', 'template']);
});
