import { Router } from 'express';
import crypto from 'node:crypto';
import { digits } from '../whatsapp/client.js';
import { bad } from '../errors.js';

export function whatsappRoutes({ db, config, auth, wa }) {
  const r = Router();
  const cfg = config.whatsapp;

  // ---- Meta webhook (public; protected by verify token + HMAC signature) ----
  r.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && cfg.verifyToken && req.query['hub.verify_token'] === cfg.verifyToken) {
      return res.status(200).type('text/plain').send(String(req.query['hub.challenge'] || ''));
    }
    res.sendStatus(403);
  });

  function validSignature(req) {
    if (!cfg.appSecret) return !config.isProd; // refuse unsigned traffic in production
    const header = req.get('x-hub-signature-256') || '';
    const want = 'sha256=' + crypto.createHmac('sha256', cfg.appSecret).update(req.rawBody || Buffer.alloc(0)).digest('hex');
    const a = Buffer.from(header);
    const b = Buffer.from(want);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  r.post('/webhook', (req, res) => {
    if (!cfg.enabled) return res.sendStatus(404);
    if (!validSignature(req)) return res.sendStatus(401);
    res.sendStatus(200); // acknowledge fast; Meta retries on slow responses
    wa.bot.processWebhook(req.body).catch((e) => console.error('[whatsapp] webhook error:', e.message));
  });

  // ---- Account linking (logged-in user) ----
  r.get('/status', auth.required, (req, res) => {
    const u = db.prepare('SELECT whatsapp_number, whatsapp_opt_in FROM users WHERE id = ?').get(req.user.id);
    res.json({
      enabled: wa.client.enabled(),
      linked: !!u.whatsapp_number,
      number: u.whatsapp_number ? '•••• ' + u.whatsapp_number.slice(-4) : null,
      optIn: !!u.whatsapp_opt_in,
      botNumber: cfg.publicNumber || null,
    });
  });

  r.post('/link-code', auth.required, (req, res) => {
    if (!wa.client.enabled()) throw bad('WhatsApp is not enabled on this server');
    db.prepare('DELETE FROM whatsapp_link_codes WHERE user_id = ? OR expires_at < ?').run(req.user.id, Date.now());
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = Date.now() + 10 * 60_000;
    db.prepare('INSERT INTO whatsapp_link_codes (code,user_id,expires_at) VALUES (?,?,?)').run(code, req.user.id, expiresAt);
    res.json({ code, expiresAt, botNumber: cfg.publicNumber || null, message: `LINK ${code}` });
  });

  r.put('/preferences', auth.required, (req, res) => {
    db.prepare('UPDATE users SET whatsapp_opt_in = ? WHERE id = ?').run(req.body?.optIn ? 1 : 0, req.user.id);
    res.json({ optIn: !!req.body?.optIn });
  });

  r.delete('/link', auth.required, (req, res) => {
    db.prepare('UPDATE users SET whatsapp_number = NULL WHERE id = ?').run(req.user.id);
    res.json({ linked: false });
  });

  return r;
}
