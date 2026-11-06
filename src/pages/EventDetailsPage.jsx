import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import EventDetails from '../components/events/EventDetails.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import { eventService, formatPrice } from '../services/eventService.js';
import { bookingService } from '../services/bookingService.js';
import { useAuth } from '../state/AuthState.jsx';
import { uid } from '../services/apiClient.js';

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [attendeeNames, setAttendeeNames] = useState(['']);

  const key = useRef(uid('idem'));

  useEffect(() => {
    eventService
      .get(id)
      .then((ev) => {
        setEvent(ev);
        eventService.recordView(id);
      })
      .catch((e) => setError(e.message));

    bookingService.seatsLeft(id).then(setSeats).catch(() => {});
  }, [id]);

  const updateAttendee = (index, value) => {
    const list = [...attendeeNames];
    list[index] = value;
    setAttendeeNames(list);
  };

  const hold = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    setBusy(true);
    setError('');

    const validAttendees = isGroup
      ? [user.name, ...attendeeNames.filter((a) => a.trim())]
      : [user.name];

    try {
      const b = await bookingService.create({
        eventId: id,
        qty,
        user,
        idempotencyKey: key.current,
        teamName: isGroup ? teamName : '',
        attendees: validAttendees,
      });
      navigate(`/bookings/${b.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (error && !event) {
    return (
      <div className="card center-card">
        <h3>{error}</h3>
        <Button to="/events" variant="outline">
          Back to events
        </Button>
      </div>
    );
  }

  if (!event) return <LoadingState text="Loading event details…" />;

  const max = Math.min(10, seats ?? 10);

  return (
    <div className="details-layout">
      <EventDetails event={event} seatsLeft={seats} />

      <aside className="card book-panel">
        <h3>{event.category === 'Museum' ? 'Select Entry Passes' : 'Choose Tickets'}</h3>

        <div className="stepper">
          <button
            onClick={() => {
              const newQty = Math.max(1, qty - 1);
              setQty(newQty);
              setAttendeeNames((prev) => prev.slice(0, newQty - 1));
            }}
            aria-label="Fewer tickets"
          >
            −
          </button>
          <b>{qty}</b>
          <button
            onClick={() => {
              const newQty = Math.min(max, qty + 1);
              setQty(newQty);
              if (newQty > qty) {
                setAttendeeNames((prev) => [...prev, '']);
              }
            }}
            aria-label="More tickets"
          >
            +
          </button>
        </div>

        {/* Group / Team Booking Toggle */}
        <div className="group-section">
          <label className="radio" style={{ fontSize: 14 }}>
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
            />
            <span className="radio-dot" /> Book as a Team / Group
          </label>

          {isGroup && (
            <div className="stack" style={{ marginTop: 8 }}>
              <input
                className="input"
                placeholder="Team / Project Name (optional)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ fontSize: 14 }}
              />

              {qty > 1 && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <small style={{ color: 'var(--muted)', fontWeight: 600 }}>Additional Member Names:</small>
                  {Array.from({ length: qty - 1 }).map((_, idx) => (
                    <input
                      key={idx}
                      className="input"
                      placeholder={`Member ${idx + 2} Full Name`}
                      value={attendeeNames[idx] || ''}
                      onChange={(e) => updateAttendee(idx, e.target.value)}
                      style={{ fontSize: 13, minHeight: 38 }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="total-row">
          <span>Total</span>
          <b>{formatPrice(qty * event.price)}</b>
        </div>

        <Button
          full
          icon="ticket"
          onClick={hold}
          disabled={busy || seats === 0}
        >
          {seats === 0
            ? 'Sold Out'
            : busy
            ? 'Holding Seats…'
            : event.price === 0
            ? 'Register for Free'
            : 'Hold Tickets & Proceed'}
        </Button>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <p className="note">
          Seats are held for 10 minutes. Your entry pass is confirmed immediately after confirmation.
        </p>
      </aside>
    </div>
  );
}
