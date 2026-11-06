import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService.js';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const cards = [
  ['Total Users', 'total_users', 'Registered customer accounts', '/admin/users', '♙'],
  ['Vendors & Organizers', 'total_vendors', 'Platform event partners', '/admin/vendors', '▣'],
  ['Total Events', 'total_events', 'Events across the platform', '/admin/events', '▤'],
  ['Total Bookings', 'total_bookings', 'All booking records', '/admin/bookings', '▧'],
];
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; adminService.dashboard().then((d) => alive && setData(d))
    .catch((e) => alive && setError(e.message || 'Could not load dashboard'));
    return () => { alive = false; }; }, []);
  return <div className="admin-dashboard">
    <div className="admin-page-heading"><div><h1>Dashboard Overview</h1>
      <p>Monitor TicketAI activity and manage the platform from one place.</p></div>
      <span className="admin-date-label">ADMIN CONTROL PANEL</span></div>
    {error && <div className="admin-alert error">{error}</div>}
    <div className="admin-stats-grid">{cards.map(([label,key,desc,path,icon]) =>
      <Link className="admin-stat-card admin-stat-link" to={path} key={key}>
        <div className="admin-stat-top"><span>{label}</span><div className="admin-stat-icon">{icon}</div></div>
        <h2>{data ? fmt(data[key]) : '—'}</h2><p>{desc}</p><span className="admin-card-link">Manage records →</span>
      </Link>)}</div>
    <div className="admin-dashboard-section">
      <div className="admin-section-heading"><div><h2>Platform Snapshot</h2><p>Live values returned by the TicketAI backend</p></div></div>
      <div className="admin-info-grid">
        <div className="admin-info-card"><h3>Confirmed Bookings</h3><strong className="admin-metric">{data ? fmt(data.confirmed_bookings) : '—'}</strong></div>
        <div className="admin-info-card"><h3>Checked-in Tickets</h3><strong className="admin-metric">{data ? fmt(data.checked_in) : '—'}</strong></div>
        <div className="admin-info-card"><h3>Confirmed Booking Value</h3><strong className="admin-metric">₹{data ? fmt(data.revenue) : '—'}</strong><p>Sandbox booking value; not verified payouts.</p></div>
      </div>
    </div>
    <div className="admin-dashboard-section"><div className="admin-section-heading"><div><h2>Admin tools</h2><p>Choose a platform management area</p></div></div>
      <div className="admin-info-grid admin-tools-grid">
        <Link className="admin-info-card" to="/admin/scanner"><h3>Global QR Scanner ↗</h3><p>Verify tickets for any event and prevent duplicate check-ins.</p></Link>
        <Link className="admin-info-card" to="/admin/reports"><h3>Reports & Analytics ↗</h3><p>Review booking status, check-ins and popular events.</p></Link>
        <Link className="admin-info-card" to="/admin/audit"><h3>Admin Audit Log ↗</h3><p>Review administrative actions and account changes.</p></Link>
      </div>
    </div>
  </div>;
}
