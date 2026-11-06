import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from './errors.js';

export function makeAuth({ db, config }) {
  const findUser = db.prepare('SELECT * FROM users WHERE id = ?');

  const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });

  function resolve(req) {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
    if (!tok) return null;
    try {
      const p = jwt.verify(tok, config.jwtSecret);
      if (p.purpose) return null; // reset tokens are not login tokens
      const user = findUser.get(p.sub) || null;
      return user && user.is_active !== 0 ? user : null;
    } catch {
      return null;
    }
  }

  const optional = (req, _res, next) => { req.user = resolve(req); next(); };

  const required = (req, _res, next) => {
    req.user = resolve(req);
    if (!req.user) return next(unauthorized('Your session has expired. Please log in again.'));
    next();
  };

  const role = (...roles) => (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(forbidden(roles.includes('admin') ? 'Administrators only' : 'Only organizers and vendors can do this'));

  return { sign, optional, required, role };
}
