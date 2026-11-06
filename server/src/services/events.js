import crypto from 'node:crypto';
import { tx } from '../db.js';
import { eventOut } from '../mappers.js';
import { bad, notFound, forbidden } from '../errors.js';

export const CATEGORIES = ['Music', 'Comedy', 'Conference', 'Culture', 'College Technical', 'Workshop', 'Museum'];

const priceInRange = (price, range) => {
  if (!range || range === 'any') return true;
  if (range === '0' || range === 'free') return price === 0;
  const [lo, hi] = String(range).split('-');
  return price >= Number(lo || 0) && (hi === undefined || hi === '' || price <= Number(hi));
};

export function makeEventService({ db }) {
  const byId = db.prepare('SELECT * FROM events WHERE id = ?');

  function list(q = {}) {
    const category = q.category || 'All';
    const eventType = q.event_type || q.eventType || 'All';
    const college = q.college || 'All';
    const branch = q.branch || 'All';
    const city = q.city || 'All';
    const price = q.price || 'any';
    const days = q.days || 'all';
    const term = String(q.q || '').trim().toLowerCase();
    const freeOnly = q.free_only === 'true';
    const hasCert = q.has_certificate === 'true';

    const where = [];
    const params = [];
    if (category !== 'All') { where.push('category = ?'); params.push(category); }
    if (college !== 'All') { where.push('college = ?'); params.push(college); }
    if (city !== 'All') { where.push('city = ?'); params.push(city); }
    if (hasCert) where.push('certificate_available = 1');
    if (freeOnly) where.push('price = 0');

    const order = q.sort === 'price_asc' ? 'price ASC, date ASC' : q.sort === 'price_desc' ? 'price DESC, date ASC' : 'date ASC';
    let rows = db.prepare(`SELECT * FROM events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`).all(...params);

    const limit = days === 'all' ? Infinity : Date.now() + Number(days) * 86400000;
    rows = rows.filter((r) => {
      if (eventType !== 'All' && ![r.event_type, r.track, r.museum_category].includes(eventType)) return false;
      if (branch !== 'All' && r.branch && r.branch !== 'All Branches' && !r.branch.includes(branch) && !branch.includes(r.branch)) return false;
      if (!freeOnly && !priceInRange(r.price, price)) return false;
      if (Number.isFinite(limit) && new Date(r.date).getTime() > limit) return false;
      if (term) {
        const hay = [r.title, r.category, r.event_type, r.track, r.museum_category, r.venue, r.city, r.college, r.branch, r.instructor, r.description]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    return rows.map(eventOut);
  }

  function get(id) {
    const r = byId.get(id);
    if (!r) throw notFound('Event not found');
    return eventOut(r);
  }

  const distinct = (col) =>
    db.prepare(`SELECT DISTINCT ${col} AS v FROM events WHERE ${col} != '' ORDER BY ${col}`).all().map((r) => r.v);

  const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
  const list_ = (v) => (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, 30) : undefined);

  /** Validate + normalise an incoming event body; `existing` (DB row) supplies defaults on update. */
  function parse(body = {}, existing = null) {
    const pick = (k, dbCol, fallback = '') => (body[k] !== undefined ? body[k] : existing ? existing[dbCol] : fallback);
    const price = Number(pick('price', 'price', 0));
    const capacity = Number(pick('capacity', 'capacity', 100));
    const out = {
      title: str(pick('title', 'title'), 200),
      category: str(pick('category', 'category')),
      event_type: str(pick('eventType', 'event_type')),
      track: str(pick('track', 'track')),
      museum_category: str(pick('museumCategory', 'museum_category')),
      college: str(pick('college', 'college')),
      branch: str(pick('branch', 'branch')),
      city: str(pick('city', 'city'), 100),
      venue: str(pick('venue', 'venue'), 200),
      date: str(pick('date', 'date'), 40),
      price,
      capacity,
      description: str(pick('description', 'description'), 4000),
      instructor: str(pick('instructor', 'instructor'), 200),
      duration: str(pick('duration', 'duration'), 100),
      opening_hours: str(pick('openingHours', 'opening_hours'), 200),
      fee_details: str(pick('feeDetails', 'fee_details'), 300),
      rules_url: str(pick('rulesUrl', 'rules_url'), 500),
      team_size: str(pick('teamSize', 'team_size'), 100),
      prize_pool: str(pick('prizePool', 'prize_pool'), 100),
      poster_url: str(pick('posterUrl', 'poster_url'), 500),
      cancellation_policy: str(pick('cancellationPolicy', 'cancellation_policy', 'Free cancellation up to 24 hours before the event'), 300),
      certificate_available: pick('certificateAvailable', 'certificate_available', 0) ? 1 : 0,
      topics: JSON.stringify(list_(body.topics) ?? JSON.parse(existing?.topics || '[]')),
      visitor_info: JSON.stringify(list_(body.visitorInfo) ?? JSON.parse(existing?.visitor_info || '[]')),
    };
    if (!out.title) throw bad('Title is required');
    if (!CATEGORIES.includes(out.category)) throw bad('Choose a valid category');
    if (!out.venue) throw bad('Venue is required');
    if (!out.date || Number.isNaN(new Date(out.date).getTime())) throw bad('Pick a valid date and time');
    if (!Number.isFinite(price) || price < 0) throw bad('Price must be 0 or more');
    if (!Number.isInteger(capacity) || capacity < 1) throw bad('Capacity must be a whole number, at least 1');
    for (const k of ['rules_url', 'poster_url']) {
      if (out[k] && !/^https?:\/\//i.test(out[k])) throw bad('URLs must start with http:// or https://');
    }
    return out;
  }

  const cols = (o) => Object.keys(o);

  function create(user, body) {
    const v = parse(body);
    const id = 'ev_' + crypto.randomBytes(5).toString('hex');
    const row = { id, ...v, college: v.college || user.college || '', vendor_id: user.id, created_at: Date.now() };
    db.prepare(`INSERT INTO events (${cols(row).join(',')}) VALUES (${cols(row).map(() => '?').join(',')})`).run(...Object.values(row));
    return eventOut(byId.get(id));
  }

  function ownedRow(user, id) {
    const r = byId.get(id);
    if (!r) throw notFound('Event not found');
    if (r.vendor_id !== user.id) throw forbidden('You can only manage events you created');
    return r;
  }

  function update(user, id, body) {
    return tx(db, () => {
      const existing = ownedRow(user, id);
      const v = parse(body, existing);
      const booked = db
        .prepare("SELECT COALESCE(SUM(qty),0) AS n FROM bookings WHERE event_id = ? AND status IN ('HELD','CONFIRMED')")
        .get(id).n;
      if (v.capacity < booked) throw bad(`Capacity cannot be lower than the ${booked} seats already booked`);
      db.prepare(`UPDATE events SET ${cols(v).map((c) => c + ' = ?').join(', ')} WHERE id = ?`).run(...Object.values(v), id);
      return eventOut(byId.get(id));
    });
  }

  function remove(user, id) {
    return tx(db, () => {
      ownedRow(user, id);
      const confirmed = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE event_id = ? AND status = 'CONFIRMED'").get(id).n;
      if (confirmed) throw bad(`${confirmed} confirmed booking(s) exist. Cancel/refund them before deleting this event.`);
      db.prepare('DELETE FROM events WHERE id = ?').run(id);
      return { ok: true };
    });
  }

  const listOwned = (user) =>
    db.prepare('SELECT * FROM events WHERE vendor_id = ? ORDER BY created_at DESC, date ASC').all(user.id).map(eventOut);

  return { list, get, distinct, create, update, remove, listOwned, ownedRow };
}
