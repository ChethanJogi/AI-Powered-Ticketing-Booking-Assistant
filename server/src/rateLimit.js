// Tiny in-memory fixed-window limiter (per IP + route). Fine for a single instance.
export function rateLimit({ windowMs = 60_000, max = 20, message = 'Too many attempts. Please wait a minute.' } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip + '|' + req.baseUrl + req.path;
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
    } else if (++h.n > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ message });
    }
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    next();
  };
}
