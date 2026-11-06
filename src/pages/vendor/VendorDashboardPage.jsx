import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import { eventService, formatPrice } from '../../services/eventService.js';
import { bookingService } from '../../services/bookingService.js';
import { useAuth } from '../../state/AuthState.jsx';
import { StatusBadge } from '../MyBookingsPage.jsx';

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([eventService.listByVendor(user.id), bookingService.listForVendor(user.id)]).then(([events, bookings]) => setData({ events, bookings }));
  }, [user.id]);

  if (!data) return <LoadingState />;
  const confirmed = data.bookings.filter((b) => b.status === 'CONFIRMED');
  const revenue = confirmed.reduce((s, b) => s + b.amount, 0);
  const cancelled = data.bookings.filter((b) => ['CANCELLED', 'REFUNDED'].includes(b.status)).length;

  return (
    <>
      <div className="title-row"><h2 className="page-title">Vendor Dashboard</h2><Button to="/vendor/events/new" icon="ticket">Create event</Button></div>
      <div className="kpis">
        <div className="card kpi"><small>Events</small><b>{data.events.length}</b></div>
        <div className="card kpi"><small>Confirmed bookings</small><b>{confirmed.length}</b></div>
        <div className="card kpi"><small>Revenue</small><b>{formatPrice(revenue)}</b></div>
        <div className="card kpi"><small>Cancelled / refunded</small><b>{cancelled}</b></div>
      </div>
      <div className="card table-card">
        <div className="title-row"><h3>Recent bookings</h3><Link to="/vendor/events">Manage events</Link></div>
        {data.bookings.length === 0 ? <p className="note">No bookings yet.</p> : (
          <table><thead><tr><th>Event</th><th>Customer</th><th>Tickets</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{data.bookings.slice(0, 8).map((b) => (
              <tr key={b.id}><td>{b.eventTitle}</td><td>{b.userName}</td><td>{b.qty}</td><td>{formatPrice(b.amount)}</td><td><StatusBadge status={b.status} /></td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
