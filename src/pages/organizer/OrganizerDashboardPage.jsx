import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import Icon from '../../components/common/Icon.jsx';
import { eventService, formatPrice, formatDate } from '../../services/eventService.js';
import { bookingService } from '../../services/bookingService.js';
import { useAuth } from '../../state/AuthState.jsx';
import { StatusBadge } from '../MyBookingsPage.jsx';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      eventService.listByVendor(user.id),
      bookingService.listForVendor(user.id),
    ]).then(([events, bookings]) => {
      setData({ events, bookings: Array.isArray(bookings) ? bookings : bookings.bookings || [] });
    });
  }, [user.id]);

  if (!data) return <LoadingState text="Loading organizer portal…" />;

  const confirmed = data.bookings.filter((b) => b.status === 'CONFIRMED');
  const checkedIn = confirmed.filter((b) => b.checkedInAt).length;
  const revenue = confirmed.reduce((s, b) => s + (b.amount || 0), 0);
  const cancelled = data.bookings.filter((b) => ['CANCELLED', 'REFUNDED'].includes(b.status)).length;

  return (
    <>
      <div className="title-row">
        <div>
          <h2 className="page-title">College Organizer Portal</h2>
          <p className="note">
            Managing events for <b>{user.college || user.name}</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button to="/organizer/scanner" variant="outline" icon="scan">
            QR Scanner & Check-in
          </Button>
          <Button to="/organizer/events/new" icon="code">
            Create College Event
          </Button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <small>Events Hosted</small>
          <b>{data.events.length}</b>
        </div>
        <div className="card kpi">
          <small>Registrations</small>
          <b>{confirmed.length}</b>
        </div>
        <div className="card kpi">
          <small>Checked-In</small>
          <b>{checkedIn}</b>
        </div>
        <div className="card kpi">
          <small>Total Revenue</small>
          <b>{formatPrice(revenue)}</b>
        </div>
      </div>

      <div className="card table-card" style={{ marginBottom: 24 }}>
        <div className="title-row">
          <h3>Your Hosted Events</h3>
          <Button to="/organizer/events/new" size="sm" icon="ticket">
            New Event
          </Button>
        </div>
        {data.events.length === 0 ? (
          <p className="note">No events hosted yet. Click &quot;Create College Event&quot; to publish one.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Category / Type</th>
                <th>Date & Time</th>
                <th>Price</th>
                <th>Capacity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <b>{e.title}</b>
                    <br />
                    <small style={{ color: 'var(--muted)' }}>{e.venue}</small>
                  </td>
                  <td>
                    <span className="badge-branch">{e.category}</span>
                    {e.eventType && <small style={{ marginLeft: 6, color: 'var(--muted)' }}>({e.eventType})</small>}
                  </td>
                  <td>{formatDate(e.date)}</td>
                  <td>{formatPrice(e.price)}</td>
                  <td>{e.capacity}</td>
                  <td className="actions">
                    <Button to={`/organizer/events/${e.id}/participants`} size="sm" variant="outline">
                      <Icon name="users" size={14} /> Participants
                    </Button>
                    <Button to={`/vendor/events/${e.id}/edit`} size="sm" variant="ghost">
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card table-card">
        <div className="title-row">
          <h3>Recent Registrations & Attendees</h3>
          <Button to="/organizer/scanner" size="sm" variant="outline" icon="scan">
            Open Scanner
          </Button>
        </div>
        {data.bookings.length === 0 ? (
          <p className="note">No participant bookings yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Event</th>
                <th>Participant</th>
                <th>Team</th>
                <th>Amount</th>
                <th>Check-in Status</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.slice(0, 10).map((b) => (
                <tr key={b.id}>
                  <td>
                    <code>{b.id}</code>
                  </td>
                  <td>{b.eventTitle}</td>
                  <td>
                    {b.userName}
                    {b.userEmail && (
                      <>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>{b.userEmail}</small>
                      </>
                    )}
                  </td>
                  <td>{b.teamName || 'Individual'}</td>
                  <td>{formatPrice(b.amount)}</td>
                  <td>
                    {b.checkedInAt ? (
                      <span className="badge badge-confirmed">
                        <Icon name="check" size={12} /> CHECKED IN
                      </span>
                    ) : (
                      <StatusBadge status={b.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

