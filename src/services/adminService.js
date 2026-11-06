import { USE_MOCK, request, db } from './apiClient.js';

function mockDashboard() {
  const users = db.get('users', []);
  const bookings = db.get('bookings', []);
  const events = db.get('events', []);
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
  return {
    total_users: users.filter((u) => u.role === 'user').length,
    total_vendors: users.filter((u) => u.role === 'vendor' || u.role === 'organizer').length,
    total_events: events.length, total_bookings: bookings.length,
    confirmed_bookings: confirmed.length,
    revenue: confirmed.reduce((s, b) => s + Number(b.amount || 0), 0),
    checked_in: bookings.filter((b) => b.checkedInAt).length,
    bookings_by_status: {},
  };
}

// Admin lists, actions and reports only exist on the real backend.
const live = (path, opts) => USE_MOCK
  ? Promise.reject(new Error('The admin panel needs the backend. Set VITE_API_URL (e.g. http://localhost:8000) in .env, start the server and restart Vite.'))
  : request(path, opts);

export const adminService = {
  dashboard: () => USE_MOCK ? Promise.resolve(mockDashboard()) : request('/admin/dashboard'),
  users: (q = '') => live(`/admin/users?limit=500&q=${encodeURIComponent(q)}`),
  vendors: () => live('/admin/vendors'),
  events: (q = '') => live(`/admin/events?limit=500&q=${encodeURIComponent(q)}`),
  bookings: (q = '') => live(`/admin/bookings?limit=500&q=${encodeURIComponent(q)}`),
  reports: () => live('/admin/reports'),
  audit: () => live('/admin/audit'),
  setUserActive: (id, active) => live(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { active } }),
  setVendorActive: (id, active) => live(`/admin/vendors/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { active } }),
  removeEvent: (id) => live(`/admin/events/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  refundBooking: (id) => live(`/admin/bookings/${encodeURIComponent(id)}/refund`, { method: 'POST', body: {} }),
  verifyTicket: (token, eventId) => live('/scan/verify', { method: 'POST', body: { token, eventId: eventId || null } }),
};
