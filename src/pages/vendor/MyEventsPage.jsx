import { useEffect, useState } from 'react';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { eventService, formatDate, formatPrice } from '../../services/eventService.js';
import { useAuth } from '../../state/AuthState.jsx';

export default function MyEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [del, setDel] = useState(null);
  const load = () => eventService.listByVendor(user.id).then(setEvents);
  useEffect(() => { load(); }, [user.id]);

  const confirmDelete = async () => { await eventService.remove(del.id); setDel(null); load(); };

  if (!events) return <LoadingState />;
  return (
    <>
      <div className="title-row"><h2 className="page-title">My Events</h2><Button to="/vendor/events/new" icon="ticket">Create event</Button></div>
      <div className="card table-card">
        <table><thead><tr><th>Event</th><th>Date</th><th>Price</th><th>Seats</th><th /></tr></thead>
          <tbody>{events.map((e) => (
            <tr key={e.id}>
              <td><b>{e.title}</b><br /><small>{e.category} · {e.venue}</small></td><td>{formatDate(e.date)}</td><td>{formatPrice(e.price)}</td><td>{e.capacity}</td>
              <td className="actions">
                <Button to={`/vendor/events/${e.id}/bookings`} variant="ghost" size="sm">Bookings</Button>
                <Button to={`/vendor/events/${e.id}/edit`} variant="outline" size="sm">Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setDel(e)}>Delete</Button>
              </td>
            </tr>
          ))}</tbody></table>
      </div>
      <Modal open={!!del} title="Delete event?" onClose={() => setDel(null)}>
        <p>“{del?.title}” will be removed. Existing bookings are not refunded automatically.</p>
        <div className="modal-actions"><Button variant="ghost" onClick={() => setDel(null)}>Keep</Button><Button variant="danger" onClick={confirmDelete}>Delete</Button></div>
      </Modal>
    </>
  );
}
