import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

const config = {
  isProd: false, port: 0, corsOrigins: [], frontendUrl: 'http://fe.test', databasePath: ':memory:',
  jwtSecret: 'test-jwt-secret-0123456789', qrSecret: 'test-qr-secret-0123456789', holdMinutes: 10,
  whatsapp: { enabled: false, token: '', phoneNumberId: '', apiVersion: 'v21.0', template: '', templateLang: 'en', appSecret: '', verifyToken: '', publicNumber: '' },
};

async function boot() {
  const ctx = createContext({ config, db: openDb(':memory:') });
  const server = createApp(ctx).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, token, method = 'GET', body) => {
    const res = await fetch(base + path, { method, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const login = async (email) => {
    const res = await fetch(base + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'demo123' }),
    });
    return (await res.json()).token;
  };
  return { server, call, login };
}

test('admin API: authentication, dashboard and read-only platform lists', async () => {
  const { server, call, login } = await boot();
  try {
    assert.equal((await call('/admin/dashboard')).status, 401);
    assert.equal((await call('/admin/dashboard', await login('demo@ticketai.in'))).status, 403);
    assert.equal((await call('/admin/dashboard', await login('organizer@ticketai.in'))).status, 403);
    const admin = await login('admin@ticketai.in');
    const dash = await call('/admin/dashboard', admin);
    assert.equal(dash.status, 200);
    assert.equal(dash.body.total_users, 1);
    assert.equal(dash.body.total_vendors, 2);
    assert.ok(dash.body.total_events > 0);
    assert.equal(dash.body.total_bookings, 0);
    const users = await call('/admin/users', admin);
    assert.equal(users.status, 200);
    assert.ok(users.body.every((u) => !('password_hash' in u) && !('passwordHash' in u)));
    assert.equal((await call('/admin/vendors', admin)).body.length, 2);
    assert.equal((await call('/admin/events', admin)).status, 200);
    assert.equal((await call('/admin/bookings', admin)).status, 200);
    assert.equal((await call('/admin/audit', admin)).status, 200);
    assert.equal((await call('/admin/reports', admin)).status, 200);
  } finally { server.close(); }
});

test('admin account controls: suspend and reactivate a user; block suspended login', async () => {
  const { server, call, login } = await boot();
  try {
    const admin = await login('admin@ticketai.in');
    const users = await call('/admin/users?role=user', admin);
    const user = users.body.find((u) => u.email === 'demo@ticketai.in');
    assert.ok(user);
    assert.equal((await call(`/admin/users/${user.id}/status`, admin, 'PATCH', { active: false })).status, 200);
    const suspendedLogin = await fetch((`http://127.0.0.1:${server.address().port}/auth/login`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@ticketai.in', password: 'demo123' }),
    });
    assert.equal(suspendedLogin.status, 401);
    assert.equal((await call(`/admin/users/${user.id}/status`, admin, 'PATCH', { active: true })).status, 200);
    const restored = await fetch(`http://127.0.0.1:${server.address().port}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@ticketai.in', password: 'demo123' }),
    });
    assert.equal(restored.status, 200);
  } finally { server.close(); }
});

test('admin can refund an un-used confirmed sandbox booking and audit the action', async () => {
  const { server, call, login } = await boot();
  try {
    const admin = await login('admin@ticketai.in');
    const student = await login('demo@ticketai.in');
    const created = await call('/bookings', student, 'POST', { eventId: 'tech_hackindia', qty: 1 });
    assert.equal(created.status, 201);
    const paid = await call(`/bookings/${created.body.id}/pay`, student, 'POST', {});
    assert.equal(paid.status, 200);
    const refunded = await call(`/admin/bookings/${created.body.id}/refund`, admin, 'POST', {});
    assert.equal(refunded.status, 200);
    assert.equal(refunded.body.status, 'REFUNDED');
    assert.equal(refunded.body.paymentAction, 'NOT_PROCESSED');
    const again = await call(`/admin/bookings/${created.body.id}/refund`, admin, 'POST', {});
    assert.equal(again.status, 400);
    const audit = await call('/admin/audit', admin);
    assert.ok(audit.body.some((x) => x.action === 'BOOKING_MARKED_REFUNDED'));
  } finally { server.close(); }
});

test('admin can scan any event while non-admins remain event-scoped', async () => {
  const { server, call, login } = await boot();
  try {
    const admin = await login('admin@ticketai.in');
    const student = await login('demo@ticketai.in');
    const organizer = await login('organizer@ticketai.in');
    const vendor = await login('vendor@ticketai.in');
    const created = await call('/bookings', student, 'POST', { eventId: 'tech_hackindia', qty: 1 });
    const paid = await call(`/bookings/${created.body.id}/pay`, student, 'POST', {});
    const token = paid.body.ticketToken;
    assert.ok(token);
    const vendorDenied = await call('/scan/verify', vendor, 'POST', { token });
    assert.equal(vendorDenied.body.code, 'NOT_YOUR_EVENT');
    const accepted = await call('/scan/verify', admin, 'POST', { token });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.code, 'CHECKED_IN');
    const duplicate = await call('/scan/verify', admin, 'POST', { token });
    assert.equal(duplicate.body.code, 'ALREADY_USED');
    const userDenied = await call('/scan/verify', student, 'POST', { token });
    assert.equal(userDenied.status, 403);
    // Organizer's route-level access remains valid; this token is already checked in, so it cannot be reused.
    const organizerDuplicate = await call('/scan/verify', organizer, 'POST', { token });
    assert.equal(organizerDuplicate.body.code, 'ALREADY_USED');
  } finally { server.close(); }
});
