import { USE_MOCK, request, db, uid } from './apiClient.js';

export const certificateService = {
  async listMine(userId) {
    if (!USE_MOCK) return request('/certificates/mine');
    return db.get(`certificates_${userId}`, [
      {
        id: 'cert_seed1',
        bookingId: 'BK_SEED1',
        eventId: 'tech_hackindia',
        eventTitle: 'HackIndia 2026: 36h National Hackathon',
        userId,
        userName: 'Demo User',
        certificateNo: 'CERT-HACK-2026-0042',
        issuedDate: '15 Oct 2026',
      },
    ]);
  },

  async issue(userId, userName, eventId, eventTitle, bookingId) {
    if (!USE_MOCK) return;
    const key = `certificates_${userId}`;
    const list = db.get(key, []);
    if (list.some((c) => c.bookingId === bookingId)) return;
    const cert = {
      id: uid('cert'),
      bookingId,
      eventId,
      eventTitle,
      userId,
      userName,
      certificateNo: `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-2026`,
      issuedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    db.set(key, [cert, ...list]);
    return cert;
  },
};

