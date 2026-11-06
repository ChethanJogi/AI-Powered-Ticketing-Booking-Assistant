import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  college TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'English',
  whatsapp_number TEXT UNIQUE,
  whatsapp_opt_in INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  track TEXT NOT NULL DEFAULT '',
  museum_category TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL,
  date TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  description TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  topics TEXT NOT NULL DEFAULT '[]',
  certificate_available INTEGER NOT NULL DEFAULT 0,
  opening_hours TEXT NOT NULL DEFAULT '',
  fee_details TEXT NOT NULL DEFAULT '',
  visitor_info TEXT NOT NULL DEFAULT '[]',
  rules_url TEXT NOT NULL DEFAULT '',
  team_size TEXT NOT NULL DEFAULT '',
  prize_pool TEXT NOT NULL DEFAULT '',
  poster_url TEXT NOT NULL DEFAULT '',
  vendor_id TEXT NOT NULL DEFAULT '',
  cancellation_policy TEXT NOT NULL DEFAULT 'Free cancellation up to 24 hours before the event',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_vendor ON events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  venue TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  team_name TEXT NOT NULL DEFAULT '',
  attendees TEXT NOT NULL DEFAULT '[]',
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'HELD',
  hold_expires_at INTEGER NOT NULL,
  ticket_code TEXT NOT NULL DEFAULT '',
  payment_ref TEXT NOT NULL DEFAULT '',
  checked_in_at TEXT,
  cancellation_policy TEXT NOT NULL DEFAULT '',
  cancelled_at INTEGER,
  reminder_set INTEGER NOT NULL DEFAULT 0,
  reminded_at INTEGER,
  idempotency_key TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idem ON bookings(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key != '';

CREATE TABLE IF NOT EXISTS wishlist (
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  certificate_no TEXT NOT NULL UNIQUE,
  issued_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_link_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  message_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_pending (
  wa_number TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`;

const DEMO_USERS = [
  { id: 'u_demo', name: 'Demo User', email: 'demo@ticketai.in', role: 'user', college: 'RV College of Engineering', phone: '+91 9876543210' },
  { id: 'u_vendor', name: 'Bharat Events', email: 'vendor@ticketai.in', role: 'vendor', college: '', phone: '+91 9888877777' },
  { id: 'u_organizer', name: 'RVCE Tech Club', email: 'organizer@ticketai.in', role: 'organizer', college: 'RV College of Engineering', phone: '+91 9123456789' },
];

const SEED_REVIEWS = [
  ['rev_1', 'tech_hackindia', 5, 'Superbly organized hackathon with top-tier mentors from Bengaluru startups!'],
  ['rev_2', 'ws_genai', 5, 'The fine-tuning labs and RAG pipelines were immediately useful in my work. Recommended!'],
  ['rev_3', 'mus_visvesvaraya', 4, 'Great educational exhibits, especially the dinosaur and aviation galleries.'],
];

export function openDb(file) {
  if (file !== ':memory:') {
    const abs = path.resolve(file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    file = abs;
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // Safe additive migration for databases created before Admin account controls.
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('is_active')) db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
  seed(db);
  ensureAdmin(db);
  return db;
}

/** Run fn inside an immediate transaction (serialises writers - needed for seat counting). */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* already rolled back */ }
    throw e;
  }
}

function seed(db) {
  const now = Date.now();
  const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
  if (!hasUsers) {
    const hash = bcrypt.hashSync('demo123', 10);
    const ins = db.prepare(
      `INSERT INTO users (id,name,email,password_hash,role,college,phone,created_at) VALUES (?,?,?,?,?,?,?,?)`
    );
    DEMO_USERS.forEach((u) => ins.run(u.id, u.name, u.email, hash, u.role, u.college, u.phone, now));
  }

  const hasEvents = db.prepare('SELECT COUNT(*) AS n FROM events').get().n > 0;
  if (!hasEvents) {
    const events = JSON.parse(fs.readFileSync(path.join(here, 'seed', 'events.json'), 'utf8'));
    const ins = db.prepare(`INSERT INTO events (
      id,title,category,event_type,track,museum_category,college,branch,city,venue,date,price,capacity,
      description,instructor,duration,topics,certificate_available,opening_hours,fee_details,visitor_info,
      rules_url,team_size,prize_pool,poster_url,vendor_id,cancellation_policy,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    events.forEach((e) =>
      ins.run(
        e.id, e.title, e.category, e.eventType || '', e.track || '', e.museumCategory || '', e.college || '',
        e.branch || '', e.city || '', e.venue, e.date, Number(e.price || 0), Number(e.capacity || 100),
        e.description || '', e.instructor || '', e.duration || '', JSON.stringify(e.topics || []),
        e.certificateAvailable ? 1 : 0, e.openingHours || '', e.feeDetails || '', JSON.stringify(e.visitorInfo || []),
        e.rulesUrl || '', e.teamSize || '', e.prizePool || '', e.posterUrl || '', e.vendorId || 'u_vendor',
        e.cancellationPolicy || 'Free cancellation up to 24 hours before the event', now
      )
    );
  }

  const hasReviews = db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n > 0;
  if (!hasReviews) {
    const ins = db.prepare(
      `INSERT INTO reviews (id,event_id,user_id,user_name,rating,comment,created_at) VALUES (?,?,?,?,?,?,?)`
    );
    SEED_REVIEWS.forEach(([id, ev, rating, comment], i) =>
      ins.run(id, ev, 'u_demo', 'Demo User', rating, comment, new Date(now - (i + 1) * 86400000).toISOString())
    );
  }
}

/**
 * Make sure one admin account exists.
 * - Production: only created when ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) are set.
 * - Development: falls back to admin@ticketai.in / demo123 so the admin portal can be tried locally.
 */
function ensureAdmin(db) {
  if (db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get()) return;
  const isProd = process.env.NODE_ENV === 'production';
  let email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  let password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || password.length < 8) {
    if (isProd) return;
    email = 'admin@ticketai.in';
    password = 'demo123';
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return;
  db.prepare(`INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)`)
    .run('u_admin', 'TicketAI Admin', email, bcrypt.hashSync(password, 10), 'admin', Date.now());
}
