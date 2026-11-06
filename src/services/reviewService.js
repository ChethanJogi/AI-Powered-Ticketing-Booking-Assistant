import { USE_MOCK, request, db, uid } from './apiClient.js';

const initialReviews = [
  { id: 'rev_1', eventId: 'tech_hackindia', userId: 'u_demo', userName: 'Demo User', rating: 5, comment: 'Superbly organized hackathon with top-tier mentors from Bengaluru startups!', createdAt: '2026-11-01T10:00:00Z' },
  { id: 'rev_2', eventId: 'ws_genai', userId: 'u_demo', userName: 'Demo User', rating: 5, comment: 'The fine-tuning labs and RAG pipelines were immediately useful in my work. Recommended!', createdAt: '2026-11-02T14:30:00Z' },
  { id: 'rev_3', eventId: 'mus_visvesvaraya', userId: 'u_demo', userName: 'Demo User', rating: 4, comment: 'Great educational exhibits, especially the dinosaur and aviation galleries.', createdAt: '2026-11-03T11:15:00Z' },
];

const allReviews = () => {
  const r = db.get('reviews', null);
  if (r) return r;
  db.set('reviews', initialReviews);
  return initialReviews;
};

export const reviewService = {
  async getForEvent(eventId) {
    if (!USE_MOCK) return request(`/events/${eventId}/reviews`);
    const reviews = allReviews().filter((r) => r.eventId === eventId);
    const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    return {
      reviews,
      average: Math.round(avg * 10) / 10,
      count: reviews.length,
    };
  },

  async addReview(eventId, { rating, comment, user }) {
    if (!USE_MOCK) {
      return request(`/events/${eventId}/reviews`, {
        method: 'POST',
        body: { rating: Number(rating), comment },
      });
    }
    const list = allReviews();
    const newRev = {
      id: uid('rev'),
      eventId,
      userId: user.id,
      userName: user.name,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    db.set('reviews', [newRev, ...list]);
    return newRev;
  },
};

