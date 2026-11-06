import { USE_MOCK, request, db } from './apiClient.js';

let idCache = null; // API mode: ids saved by the current user (one request instead of one per card)
let idCacheFor = null;

export const wishlistService = {
  async list(userId) {
    if (!USE_MOCK) return request('/wishlist');
    const ids = db.get(`wishlist_${userId}`, []);
    const events = db.get('events', []);
    return events.filter((e) => ids.includes(e.id));
  },

  async isWishlisted(userId, eventId) {
    if (!userId) return false;
    if (!USE_MOCK) {
      if (!idCache || idCacheFor !== userId) {
        idCacheFor = userId;
        idCache = request('/wishlist/ids').catch(() => []);
      }
      return (await idCache).includes(eventId);
    }
    const ids = db.get(`wishlist_${userId}`, []);
    return ids.includes(eventId);
  },

  async toggle(userId, eventId) {
    if (!USE_MOCK) {
      const res = await request(`/wishlist/toggle?event_id=${encodeURIComponent(eventId)}`, { method: 'POST' });
      idCache = null; // refetch next time
      return res;
    }
    const key = `wishlist_${userId}`;
    const list = db.get(key, []);
    const exists = list.includes(eventId);
    const updated = exists ? list.filter((id) => id !== eventId) : [...list, eventId];
    db.set(key, updated);
    return { saved: !exists };
  },
};

