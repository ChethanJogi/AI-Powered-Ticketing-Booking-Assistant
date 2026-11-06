import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { wrap, bad, unauthorized } from '../errors.js';
import { userOut } from '../mappers.js';
import { rateLimit } from '../rateLimit.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['user', 'vendor', 'organizer'];
const LANGS = ['English', 'Hindi', 'Kannada'];

export function authRoutes({ db, config, auth }) {
  const r = Router();
  const limiter = rateLimit({ max: 15 });
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  const fingerprint = (u) => crypto.createHash('sha256').update(u.password_hash).digest('hex').slice(0, 16);

  r.post('/register', limiter, wrap(async (req, res) => {
    const { name, email, password, role, college } = req.body || {};
    const mail = String(email || '').trim().toLowerCase();
    if (!String(name || '').trim()) throw bad('Please enter your name');
    if (!EMAIL.test(mail)) throw bad('Enter a valid email address');
    if (String(password || '').length < 6) throw bad('Password must be at least 6 characters');
    if (byEmail.get(mail)) throw bad('This email is already registered');

    const id = 'u_' + crypto.randomBytes(5).toString('hex');
    db.prepare(`INSERT INTO users (id,name,email,password_hash,role,college,created_at) VALUES (?,?,?,?,?,?,?)`).run(
      id, String(name).trim().slice(0, 100), mail, await bcrypt.hash(String(password), 10),
      ROLES.includes(role) ? role : 'user', String(college || '').trim().slice(0, 150), Date.now()
    );
    const u = byId.get(id);
    res.status(201).json({ user: userOut(u), token: auth.sign(u) });
  }));

  r.post('/login', limiter, wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const u = byEmail.get(String(email || '').trim().toLowerCase());
    const ok = u && (await bcrypt.compare(String(password || ''), u.password_hash));
    if (!ok) throw unauthorized('Wrong email or password');
    if (u.is_active === 0) throw unauthorized('This account has been suspended. Contact TicketAI support.');
    res.json({ user: userOut(u), token: auth.sign(u) });
  }));

  r.get('/me', auth.required, (req, res) => res.json(userOut(req.user)));

  r.put('/me', auth.required, (req, res) => {
    const { name, phone, language, college } = req.body || {};
    const next = {
      name: name !== undefined ? String(name).trim().slice(0, 100) : req.user.name,
      phone: phone !== undefined ? String(phone).trim().slice(0, 30) : req.user.phone,
      language: language !== undefined ? String(language) : req.user.language,
      college: college !== undefined ? String(college).trim().slice(0, 150) : req.user.college,
    };
    if (!next.name) throw bad('Name cannot be empty');
    if (!LANGS.includes(next.language)) throw bad('Unsupported language');
    if (next.phone && !/^[+\d][\d\s-]{6,20}$/.test(next.phone)) throw bad('Enter a valid phone number');
    db.prepare('UPDATE users SET name = ?, phone = ?, language = ?, college = ? WHERE id = ?')
      .run(next.name, next.phone, next.language, next.college, req.user.id);
    res.json(userOut(byId.get(req.user.id)));
  });

  r.post('/forgot-password', limiter, (req, res) => {
    const u = byEmail.get(String(req.body?.email || '').trim().toLowerCase());
    const out = { message: 'If this email exists, a reset link has been sent.' };
    if (u) {
      const token = jwt.sign({ sub: u.id, purpose: 'reset', fp: fingerprint(u) }, config.jwtSecret, { expiresIn: '30m' });
      // No email provider is wired up yet. In development the token is returned so the flow can be tested;
      // in production plug in an email sender here and never return the token.
      if (!config.isProd) {
        out.demoToken = token;
        console.log(`[auth] password reset link for ${u.email}: ${config.frontendUrl}/reset-password?token=${token}`);
      }
    }
    res.json(out);
  });

  r.post('/reset-password', limiter, wrap(async (req, res) => {
    const { token, password } = req.body || {};
    if (String(password || '').length < 6) throw bad('Password must be at least 6 characters');
    let p;
    try { p = jwt.verify(String(token || ''), config.jwtSecret); } catch { throw bad('This reset link is invalid or has expired'); }
    const u = p.purpose === 'reset' ? byId.get(p.sub) : null;
    if (!u || p.fp !== fingerprint(u)) throw bad('This reset link is invalid or has expired');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(String(password), 10), u.id);
    res.json({ message: 'Password updated' });
  }));

  return r;
}
