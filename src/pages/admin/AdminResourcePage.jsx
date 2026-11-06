import { useCallback, useEffect, useRef, useState } from 'react';
import { adminService } from '../../services/adminService.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const date = (v) => v ? new Date(v).toLocaleString('en-IN') : '—';

export default function AdminResourcePage({ resource }) {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const load = useCallback(async (q = query) => {
    const ticket = ++latest.current; // ignore out-of-order responses while typing
    setError(''); setLoading(true);
    try {
      const loaders = { users: () => adminService.users(q), vendors: () => adminService.vendors(),
        events: () => adminService.events(q), bookings: () => adminService.bookings(q) };
      const data = await loaders[resource]();
      if (ticket === latest.current) setRows(Array.isArray(data) ? data : []);
    } catch (e) { if (ticket === latest.current) setError(e.message || 'Could not load records'); }
    finally { if (ticket === latest.current) setLoading(false); }
  }, [resource, query]);

  // Debounce search typing; load immediately on first render / resource change.
  useEffect(() => { const t = setTimeout(load, query ? 300 : 0); return () => clearTimeout(t); }, [load, query]);

  const act = async (id, action) => {
    const prompts = {
      suspend: 'Suspend this account? The person will no longer be able to sign in.',
      activate: 'Reactivate this account?',
      remove: 'Remove this event? Events with booking history are protected.',
      refund: 'Mark this booking as refunded? This only updates TicketAI records; no money is transferred.',
    };
    if (!window.confirm(prompts[action])) return;
    setBusy(id); setError(''); setNotice('');
    try {
      if (action === 'suspend' || action === 'activate') {
        const fn = resource === 'vendors' ? adminService.setVendorActive : adminService.setUserActive;
        await fn(id, action === 'activate');
      } else if (action === 'remove') await adminService.removeEvent(id);
      else if (action === 'refund') {
        const result = await adminService.refundBooking(id);
        setNotice(result.message);
      }
      await load();
    } catch (e) { setError(e.message || 'Action failed'); }
    finally { setBusy(''); }
  };

  const title = { users: 'User Management', vendors: 'Vendor & Organizer Management',
    events: 'Event Management', bookings: 'Booking Management' }[resource];
  const searchable = ['users', 'events', 'bookings'].includes(resource);

  return <section className="admin-resource">
    <div className="admin-page-heading">
      <div><h1>{title}</h1><p>Platform-wide records and administrative actions.</p></div>
      <span className="admin-date-label">{loading ? 'LOADING…' : `${rows.length.toLocaleString('en-IN')} RECORDS`}</span>
    </div>
    {searchable && <div className="admin-toolbar">
      <input aria-label="Search records" placeholder="Search by name, email, ID or title…" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      <button className="admin-button secondary" onClick={() => load()}>Refresh</button>
    </div>}
    {error && <div className="admin-alert error" role="alert">{error}</div>}
    {notice && <div className="admin-alert success" role="status">{notice}</div>}
    <div className="admin-table-wrap">
      <table className="admin-table">
        {resource === 'users' && <>
          <thead><tr><th>User</th><th>Role</th><th>College</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{rows.map((u) => <tr key={u.id}><td><b>{u.name}</b><small>{u.email}</small><small>{u.id}</small></td>
            <td>{u.role}</td><td>{u.college || '—'}</td><td>{date(u.createdAt)}</td>
            <td><span className={`admin-pill ${u.isActive ? 'good' : 'bad'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
            <td>{u.role === 'admin' ? 'Protected' : <button disabled={busy === u.id} className="admin-button"
              onClick={() => act(u.id, u.isActive ? 'suspend' : 'activate')}>{u.isActive ? 'Suspend' : 'Reactivate'}</button>}</td></tr>)}</tbody>
        </>}
        {resource === 'vendors' && <>
          <thead><tr><th>Vendor / Organizer</th><th>Role</th><th>Phone</th><th>Events</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{rows.map((u) => <tr key={u.id}><td><b>{u.name}</b><small>{u.email}</small><small>{u.id}</small></td>
            <td>{u.role}</td><td>{u.phone || '—'}</td><td>{u.eventCount}</td>
            <td><span className={`admin-pill ${u.isActive ? 'good' : 'bad'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
            <td><button disabled={busy === u.id} className="admin-button" onClick={() => act(u.id, u.isActive ? 'suspend' : 'activate')}>{u.isActive ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</tbody>
        </>}
        {resource === 'events' && <>
          <thead><tr><th>Event</th><th>Category</th><th>City / Venue</th><th>Date</th><th>Price</th><th>Action</th></tr></thead>
          <tbody>{rows.map((e) => <tr key={e.id}><td><b>{e.title}</b><small>{e.id}</small></td><td>{e.category}</td>
            <td>{e.city || '—'}<small>{e.venue}</small></td><td>{e.date}</td><td>{money(e.price)}</td>
            <td><button disabled={busy === e.id} className="admin-button danger" onClick={() => act(e.id, 'remove')}>Remove</button></td></tr>)}</tbody>
        </>}
        {resource === 'bookings' && <>
          <thead><tr><th>Booking</th><th>Customer</th><th>Event</th><th>Qty</th><th>Amount</th><th>Status</th><th>Check-in / Action</th></tr></thead>
          <tbody>{rows.map((b) => <tr key={b.id}><td><b>{b.id}</b><small>{date(b.createdAt)}</small></td>
            <td>{b.userName}<small>{b.userEmail}</small></td><td>{b.eventTitle}<small>{b.eventId}</small></td>
            <td>{b.qty}</td><td>{money(b.amount)}</td><td><span className="admin-pill">{b.status}</span></td>
            <td>{b.checkedInAt ? `Checked in: ${b.checkedInAt}` : b.status === 'CONFIRMED'
              ? <button disabled={busy === b.id} className="admin-button" onClick={() => act(b.id, 'refund')}>Mark refunded</button> : '—'}</td></tr>)}</tbody>
        </>}
        {!loading && rows.length === 0 && !error && <tbody><tr><td colSpan="8" className="admin-empty">No records found.</td></tr></tbody>}
      </table>
    </div>
    {resource === 'bookings' && <p className="admin-footnote">Refund action updates the local TicketAI booking status only. A payment gateway is not connected, so it does not transfer money.</p>}
    {resource === 'events' && <p className="admin-footnote">Events with booking history cannot be removed, preserving customer and financial records.</p>}
  </section>;
}
