import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import { eventService, formatDate, formatPrice } from '../../services/eventService.js';
import { bookingService } from '../../services/bookingService.js';
import { StatusBadge } from '../MyBookingsPage.jsx';

export default function EventBookingsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [list, setList] = useState(null);
  useEffect(() => { eventService.get(id).then(setEvent); bookingService.listForEvent(id).then(setList); }, [id]);
  if (!event || !list) return <LoadingState />;
  return (
    <>
      <div className="title-row"><h2 className="page-title">Bookings · {event.title}</h2><Button to="/vendor/events" variant="outline">Back</Button></div>
      <div className="card table-card">
        {list.length === 0 ? <p className="note">No bookings for this event yet.</p> : (
          <table><thead><tr><th>Booking</th><th>Customer</th><th>Tickets</th><th>Amount</th><th>Booked</th><th>Status</th></tr></thead>
            <tbody>{list.map((b) => (
              <tr key={b.id}><td>{b.id}</td><td>{b.userName}</td><td>{b.qty}</td><td>{formatPrice(b.amount)}</td><td>{formatDate(new Date(b.createdAt).toISOString())}</td><td><StatusBadge status={b.status} /></td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
