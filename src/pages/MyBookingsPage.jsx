import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/common/LoadingState.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import { bookingService } from '../services/bookingService.js';
import { formatDate, formatPrice } from '../services/eventService.js';
import { useAuth } from '../state/AuthState.jsx';

export const StatusBadge = ({ status }) => (
  <span className={`badge badge-${(status || '').toLowerCase()}`}>
    {status === 'HELD' ? 'PAYMENT PENDING' : status}
  </span>
);

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL');

  useEffect(() => {
    bookingService.listMine(user.id).then(setList);
  }, [user.id]);

  if (!list) return <LoadingState text="Loading your registrations…" />;

  const now = Date.now();
  const filteredList = list.filter((b) => {
    if (filterTab === 'UPCOMING') {
      return (b.status === 'CONFIRMED' || b.status === 'HELD') && new Date(b.eventDate).getTime() >= now;
    }
    if (filterTab === 'PAST') {
      return b.status === 'CONFIRMED' && new Date(b.eventDate).getTime() < now;
    }
    if (filterTab === 'CANCELLED') {
      return b.status === 'CANCELLED' || b.status === 'REFUNDED' || b.status === 'EXPIRED';
    }
    return true;
  });

  return (
    <>
      <div className="title-row">
        <div>
          <h2 className="page-title">My Registrations & Bookings</h2>
          <p className="note">Track your tickets, entry passes, and booking history</p>
        </div>
        <Button to="/events" size="sm" icon="ticket">
          Browse More Events
        </Button>
      </div>

      {/* History Tabs */}
      <div className="discovery-bar" role="tablist" aria-label="Filter bookings by status">
        {[
          { key: 'ALL', label: `All (${list.length})` },
          { key: 'UPCOMING', label: 'Upcoming Events' },
          { key: 'PAST', label: 'Past Events' },
          { key: 'CANCELLED', label: 'Cancelled / Expired' },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={filterTab === tab.key}
            className={`discovery-pill ${filterTab === tab.key ? 'active' : ''}`}
            onClick={() => setFilterTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredList.length === 0 ? (
        <div className="card center-card" style={{ padding: '50px 20px' }}>
          <h3>No bookings in this category</h3>
          <p>
            {filterTab === 'ALL'
              ? 'You have not registered for any events yet.'
              : `You have no ${filterTab.toLowerCase()} bookings.`}
          </p>
          <Button to="/events">Explore Events</Button>
        </div>
      ) : (
        <div className="stack">
          {filteredList.map((b) => (
            <Link key={b.id} to={`/bookings/${b.id}`} className="card row-card">
              <div>
                <h3 style={{ fontSize: 18 }}>{b.eventTitle}</h3>
                <p className="meta">
                  <Icon name="calendar" size={14} /> {formatDate(b.eventDate)} · <Icon name="pin" size={14} /> {b.venue}
                </p>
                <p className="meta" style={{ marginTop: 2 }}>
                  {b.qty} ticket{b.qty > 1 ? 's' : ''} {b.teamName && `· Team: ${b.teamName}`} ·{' '}
                  <b>{formatPrice(b.amount)}</b> · Booking ID: <code>{b.id}</code>
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={b.status} />
                {b.checkedInAt && (
                  <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>
                    <Icon name="check" size={12} /> Checked in
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
