// Central place for talking to the backend.
// If VITE_API_URL is empty the app runs in DEMO mode using browser storage.
export const API_URL = import.meta.env.VITE_API_URL || '';
export const USE_MOCK = !API_URL;

export const db = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('ticketai_' + key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem('ticketai_' + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem('ticketai_' + key);
  },
};

export const uid = (prefix = 'id') => prefix + '_' + Math.random().toString(36).slice(2, 9);

// Paths where a 401 just means "wrong credentials", not "your session expired".
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

export async function request(path, { method = 'GET', body } = {}) {
  const token = db.get('token', null);
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the TicketAI server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !AUTH_PATHS.includes(path)) {
      // Token expired or invalid (e.g. leftover demo-mode token): sign the user out everywhere.
      db.remove('token');
      db.remove('user');
      window.dispatchEvent(new Event('ticketai:unauthorized'));
    }
    throw new Error(data.message || data.detail || `Request failed (${res.status})`);
  }
  return data;
}
