import { eventOut } from '../mappers.js';

const TECH_TYPES = ['hackathon', 'coding', 'ai/ml', 'robotics', 'cybersecurity', 'symposium', 'paper', 'project', 'innovation'];

/**
 * Rule-based assistant that answers from LIVE database rows (never invented events).
 * Returns { text, events: [eventJson] }. Shared by the web chat (/ai/chat) and the WhatsApp bot.
 */
export function makeAiService({ db }) {
  const all = () => db.prepare('SELECT * FROM events ORDER BY date ASC').all().map(eventOut);
  const upcoming = (list) => list.filter((e) => new Date(e.date).getTime() >= Date.now());

  function chat(message, { userId = null } = {}) {
    const text = String(message || '').toLowerCase().trim().slice(0, 500);
    const events = upcoming(all());
    const pack = (found, intro, max = 4) => ({
      text: found.length ? intro(found.length) : "I couldn't find anything matching that right now. Try another interest, city or budget.",
      events: found.slice(0, max),
    });

    const has = (...w) => w.some((x) => text.includes(x));

    if (/\b(how|cancel|refund|policy|hold|register)\b/.test(text) && !has('workshop', 'hackathon')) {
      return {
        text: 'Pick an event, choose how many tickets (or book as a team) and tap "Hold tickets". Seats are reserved for 10 minutes. Once payment is confirmed you get a signed QR ticket. Cancellations follow the refund policy shown on each event.',
        events: [],
      };
    }

    const budget = text.match(/(?:under|below|less than|within|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+)/);
    if (budget) {
      const max = Number(budget[1]);
      return pack(events.filter((e) => e.price <= max), (n) => `Found ${n} event${n > 1 ? 's' : ''} at ₹${max} or less:`);
    }

    if (has('free') && has('workshop')) {
      return pack(events.filter((e) => e.category === 'Workshop' && e.price === 0), (n) => `I found ${n} free workshop${n > 1 ? 's' : ''}:`);
    }
    if (has('hackathon') || (has('engineering') && has('student'))) {
      return pack(
        events.filter((e) => /hackathon/i.test(`${e.title} ${e.eventType || ''} ${e.description}`)),
        (n) => `Here ${n > 1 ? 'are' : 'is'} ${n} hackathon${n > 1 ? 's' : ''} for engineering students:`
      );
    }
    if (has('technical', 'coding', 'robotics', 'symposium', 'competition', 'college')) {
      return pack(
        events.filter((e) => e.category === 'College Technical' || TECH_TYPES.some((k) => (e.eventType || '').toLowerCase().includes(k))),
        (n) => `Here are ${n} college technical event${n > 1 ? 's' : ''} open for registration:`
      );
    }
    if (has('certificate', 'certified', 'certification')) {
      return pack(events.filter((e) => e.certificateAvailable), (n) => `${n} event${n > 1 ? 's' : ''} that give a certificate:`);
    }
    if (has('museum', 'tourism', 'gallery', 'heritage')) {
      return pack(events.filter((e) => e.category === 'Museum'), (n) => `Here are ${n} museums and heritage visits:`);
    }
    if (has('workshop', 'bootcamp', 'masterclass')) {
      return pack(events.filter((e) => e.category === 'Workshop'), (n) => `Here are ${n} hands-on workshop${n > 1 ? 's' : ''}:`);
    }
    if (has('music', 'concert', 'festival')) {
      return pack(events.filter((e) => ['Music', 'Culture'].includes(e.category)), (n) => `Here are ${n} music and culture event${n > 1 ? 's' : ''}:`);
    }
    if (has('comedy', 'stand-up', 'standup')) {
      return pack(events.filter((e) => e.category === 'Comedy'), (n) => `Here ${n > 1 ? 'are' : 'is'} ${n} comedy show${n > 1 ? 's' : ''}:`);
    }
    if (has('free')) {
      return pack(events.filter((e) => e.price === 0), (n) => `Here are ${n} free event${n > 1 ? 's' : ''}:`);
    }

    // City match: any known city name appearing in the message ("bangalore" is an alias for Bengaluru).
    const normalized = text.replace('bangalore', 'bengaluru');
    const cities = [...new Set(events.map((e) => e.city).filter(Boolean))];
    const city = cities.find((c) => normalized.includes(c.toLowerCase()));
    if (city) {
      return pack(events.filter((e) => e.city === city), (n) => `Found ${n} event${n > 1 ? 's' : ''} in ${city}:`);
    }

    if (has('recommend', 'interest', 'for me', 'suggest', 'something')) {
      let found = [];
      if (userId) {
        const cats = db.prepare('SELECT DISTINCT e.category FROM wishlist w JOIN events e ON e.id = w.event_id WHERE w.user_id = ?')
          .all(userId).map((r) => r.category);
        const saved = new Set(db.prepare('SELECT event_id FROM wishlist WHERE user_id = ?').all(userId).map((r) => r.event_id));
        if (cats.length) found = events.filter((e) => cats.includes(e.category) && !saved.has(e.id));
      }
      if (!found.length) found = events.filter((e) => ['College Technical', 'Workshop'].includes(e.category));
      return pack(found, () => 'Based on what is popular and what you have saved, here are my picks:');
    }

    const words = text.split(/\s+/).filter((w) => w.length > 2);
    if (words.length) {
      const matched = events.filter((e) => {
        const line = `${e.title} ${e.category} ${e.eventType || ''} ${e.track || ''} ${e.venue} ${e.city} ${e.college || ''}`.toLowerCase();
        return words.some((w) => line.includes(w));
      });
      if (matched.length) return pack(matched, (n) => `I found ${n} event${n > 1 ? 's' : ''} matching your search:`);
    }

    return {
      text: 'I can help you find hackathons, free workshops, technical symposiums, museums, concerts and events with certificates. Here are a few popular ones:',
      events: events.slice(0, 3),
    };
  }

  return { chat };
}
