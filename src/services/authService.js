import { USE_MOCK, request, db, uid } from './apiClient.js';

const seed = [
  { id: 'u_demo', name: 'Demo User', email: 'demo@ticketai.in', password: 'demo123', role: 'user', college: 'RV College of Engineering', phone: '+91 9876543210', language: 'English' },
  { id: 'u_vendor', name: 'Bharat Events', email: 'vendor@ticketai.in', password: 'demo123', role: 'vendor', college: '', phone: '+91 9888877777', language: 'English' },
  { id: 'u_organizer', name: 'RVCE Tech Club', email: 'organizer@ticketai.in', password: 'demo123', role: 'organizer', college: 'RV College of Engineering', phone: '+91 9123456789', language: 'English' },
  { id: 'u_admin', name: 'TicketAI Admin', email: 'admin@ticketai.in', password: 'demo123', role: 'admin', college: '', phone: '', language: 'English' },
];

const users = () => {
  const u = db.get('users', null);
  if (u && u.length >= seed.length) return u;
  db.set('users', seed);
  return seed;
};

const strip = ({ password, ...rest }) => rest;

export const authService = {
  async login(email, password) {
    if (!USE_MOCK) {
      const r = await request('/auth/login', { method: 'POST', body: { email, password } });
      db.set('token', r.token);
      return r.user;
    }
    const u = users().find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('Wrong email or password');
    db.set('token', u.id);
    return strip(u);
  },

  async register({ name, email, password, role, college }) {
    if (!USE_MOCK) {
      const r = await request('/auth/register', { method: 'POST', body: { name, email, password, role, college } });
      db.set('token', r.token);
      return r.user;
    }
    const list = users();
    const mail = email.trim().toLowerCase();
    if (list.some((x) => x.email === mail)) throw new Error('This email is already registered');
    const u = {
      id: uid('u'),
      name: name.trim(),
      email: mail,
      password,
      role: role === 'vendor' ? 'vendor' : role === 'organizer' ? 'organizer' : 'user',
      college: college ? college.trim() : '',
      phone: '',
      language: 'English',
    };
    db.set('users', [...list, u]);
    db.set('token', u.id);
    return strip(u);
  },

  async forgotPassword(email) {
    if (!USE_MOCK) return request('/auth/forgot-password', { method: 'POST', body: { email } });
    const exists = users().some((x) => x.email === email.trim().toLowerCase());
    return {
      message: 'If this email exists, a reset link has been sent.',
      demoToken: exists ? btoa(email.trim().toLowerCase()) : null,
    };
  },

  async resetPassword(token, password) {
    if (!USE_MOCK) return request('/auth/reset-password', { method: 'POST', body: { token, password } });
    let mail;
    try {
      mail = atob(token);
    } catch {
      throw new Error('Invalid reset link');
    }
    const list = users();
    if (!list.some((x) => x.email === mail)) throw new Error('Invalid reset link');
    db.set('users', list.map((x) => (x.email === mail ? { ...x, password } : x)));
    return { message: 'Password updated' };
  },

  async updateProfile(id, patch) {
    if (!USE_MOCK) return request('/auth/me', { method: 'PUT', body: patch });
    const list = users().map((x) => (x.id === id ? { ...x, ...patch } : x));
    db.set('users', list);
    return strip(list.find((x) => x.id === id));
  },
};
