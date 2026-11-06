import { USE_MOCK, request } from './apiClient.js';
import { eventService, formatPrice } from './eventService.js';
import { wishlistService } from './wishlistService.js';

export const aiService = {
  async chat(message, language = 'English', user = null) {
    if (!USE_MOCK) {
      try {
        const res = await request('/ai/chat', { method: 'POST', body: { message, language } });
        return res;
      } catch (e) {
        console.warn('Backend AI failed, falling back to local engine:', e);
      }
    }

    const text = message.toLowerCase().trim();
    const events = await eventService.list({});

    // 1. Technical events query
    if (
      text.includes('technical') ||
      text.includes('coding') ||
      text.includes('robotics') ||
      text.includes('symposium')
    ) {
      const found = events.filter(
        (e) =>
          e.category === 'College Technical' ||
          ['hackathon', 'coding', 'ai_ml', 'robotics', 'cybersecurity'].some((k) =>
            (e.eventType || '').toLowerCase().includes(k)
          )
      );
      return {
        text: `Here are ${found.length} premier college technical events and competitions open for registration:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 2. Free workshops query
    if (text.includes('free workshop') || (text.includes('free') && text.includes('workshop'))) {
      const found = events.filter((e) => e.category === 'Workshop' && e.price === 0);
      return {
        text: `I found ${found.length} free technical workshops providing completion certificates:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 3. Hackathons for engineering students
    if (text.includes('hackathon') || (text.includes('engineering') && text.includes('student'))) {
      const found = events.filter(
        (e) =>
          (e.title || '').toLowerCase().includes('hackathon') ||
          (e.eventType || '').toLowerCase().includes('hackathon') ||
          (e.description || '').toLowerCase().includes('hackathon')
      );
      return {
        text: `Here are high-impact hackathons tailored for engineering students with prizes and mentorship:`,
        events: found.slice(0, 3).map((e) => e.id),
      };
    }

    // 4. Events in Bengaluru
    if (text.includes('bengaluru') || text.includes('bangalore')) {
      const found = events.filter((e) => (e.city || '').toLowerCase() === 'bengaluru');
      return {
        text: `Found ${found.length} exciting events, workshops and exhibitions in Bengaluru:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 5. Events that provide certificates
    if (text.includes('certificate') || text.includes('certification') || text.includes('certified')) {
      const found = events.filter((e) => e.certificateAvailable);
      return {
        text: `These ${found.length} events and workshops provide verified certificates of participation:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 6. Recommend events based on interests
    if (text.includes('interest') || text.includes('recommend') || text.includes('for me')) {
      let found = [];
      if (user) {
        const wish = await wishlistService.list(user.id).catch(() => []);
        if (wish.length) {
          const wishCats = new Set(wish.map((e) => e.category));
          found = events.filter((e) => wishCats.has(e.category) && !wish.some((w) => w.id === e.id));
        }
      }
      if (!found.length) {
        found = events.filter((e) => e.category === 'College Technical' || e.category === 'Workshop');
      }
      return {
        text: `Based on developer trends and top-rated categories, here are curated recommendations:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 7. General Museums & Tourism
    if (text.includes('museum') || text.includes('tourism') || text.includes('art gallery')) {
      const found = events.filter((e) => e.category === 'Museum');
      return {
        text: `Explore these prominent historical, science, art, and cultural heritage locations:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 8. General Workshops
    if (text.includes('workshop')) {
      const found = events.filter((e) => e.category === 'Workshop');
      return {
        text: `Here are hands-on workshops across AI, Cloud, Cybersecurity, and Web Development:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    // 9. Budget / cheap queries
    const budget = text.match(/(?:under|below|less than)\s*₹?\s*(\d+)/);
    if (budget) {
      const maxPrice = Number(budget[1]);
      const found = events.filter((e) => e.price <= maxPrice);
      return {
        text: `Found ${found.length} events under ₹${maxPrice}:`,
        events: found.slice(0, 4).map((e) => e.id),
      };
    }

    if (/how|cancel|refund|policy|hold|register/.test(text)) {
      return {
        text: 'Select any event, choose your ticket count (or book as a team) and click "Hold tickets". Tickets are reserved for 10 minutes. Once confirmed, you receive an HMAC-signed QR ticket. Cancellations follow the event refund policy shown on the ticket.',
        events: [],
      };
    }

    // General keyword match
    const keywords = text.split(/\s+/).filter((w) => w.length > 2);
    const matched = events.filter((e) => {
      const line = `${e.title} ${e.category} ${e.eventType || ''} ${e.venue} ${e.city}`.toLowerCase();
      return keywords.some((k) => line.includes(k));
    });

    if (matched.length) {
      return {
        text: `I found ${matched.length} event${matched.length > 1 ? 's' : ''} matching your inquiry:`,
        events: matched.slice(0, 4).map((e) => e.id),
      };
    }

    return {
      text: 'I can help you find college hackathons, free workshops, technical symposiums, museums, and events with certificates. Try clicking one of the suggested prompts below!',
      events: events.slice(0, 3).map((e) => e.id),
    };
  },
};
