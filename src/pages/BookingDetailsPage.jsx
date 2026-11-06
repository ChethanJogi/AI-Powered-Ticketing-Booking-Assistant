import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingState from '../components/common/LoadingState.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Icon from '../components/common/Icon.jsx';
import { bookingService } from '../services/bookingService.js';
import { qrService } from '../services/qrService.js';
import { formatDate, formatPrice } from '../services/eventService.js';
import { StatusBadge } from './MyBookingsPage.jsx';
import { useAuth } from '../state/AuthState.jsx';

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((target - now) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function BookingDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [b, setB] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const left = useCountdown(b?.holdExpiresAt || 0);

  const load = () =>
    bookingService
      .get(id)
      .then((data) => {
        setB(data);
        if (data.status === 'CONFIRMED') {
          qrService.generateQrDataUrl(data.id, data.eventId).then(setQrDataUrl).catch(() => {});
        }
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [id]);

  const act = async (fn, close) => {
    setBusy(true);
    setError('');
    try {
      const updated = await fn(id);
      setB(updated);
      if (updated.status === 'CONFIRMED') {
        qrService.generateQrDataUrl(updated.id, updated.eventId).then(setQrDataUrl).catch(() => {});
      }
      close(false);
    } catch (e) {
      setError(e.message);
      close(false);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToken = () => {
    if (!b) return;
    const token = qrService.tokenFor(b);
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReminder = async () => {
    try {
      const active = await bookingService.toggleReminder(id);
      setB((prev) => ({ ...prev, reminderSet: active }));
      if (active && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (error && !b) {
    return (
      <div className="card center-card">
        <h3>{error}</h3>
        <Button to="/bookings" variant="outline">
          My bookings
        </Button>
      </div>
    );
  }

  if (!b) return <LoadingState text="Loading ticket details…" />;

  const isOrganizerOrVendor = user?.role === 'organizer' || user?.role === 'vendor';

  return (
    <div className="ticket-wrap">
      <div className="card ticket">
        <div className="ticket-head">
          <div>
            <h2>{b.eventTitle}</h2>
            <p className="meta" style={{ marginTop: 2 }}>
              <Icon name="calendar" size={15} /> {formatDate(b.eventDate)} · <Icon name="pin" size={15} /> {b.venue}
            </p>
          </div>
          <StatusBadge status={b.status} />
        </div>

        {/* Booking Details Summary Grid */}
        <div className="facts" style={{ marginTop: 6, marginBottom: 8 }}>
          <div>
            <small>Attendee</small>
            <b style={{ fontSize: 16 }}>{b.userName}</b>
          </div>
          <div>
            <small>Tickets / Seats</small>
            <b>{b.qty}</b>
          </div>
          <div>
            <small>Amount Paid</small>
            <b>{formatPrice(b.amount)}</b>
          </div>
        </div>

        {b.teamName && (
          <div className="banner" style={{ background: '#F5F3FF', color: 'var(--p-dark)' }}>
            <div>
              <b>Team Registration:</b> {b.teamName}
              {Array.isArray(b.attendees) && b.attendees.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  Members: {b.attendees.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Payment Hold Banner */}
        {b.status === 'HELD' && (
          <div className="banner warn">
            <div>
              <b>Not confirmed yet.</b> Pay within <b>{left}</b> to confirm your seat.
            </div>
            <Button onClick={() => setPayOpen(true)}>Pay {formatPrice(b.amount)}</Button>
          </div>
        )}

        {/* Confirmed QR Ticket View */}
        {b.status === 'CONFIRMED' && (
          <div className="real-qr-card">
            <div className="banner ok" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div>
                <b>
                  <Icon name="check" size={16} /> Booking Confirmed
                </b>
                <p style={{ fontSize: 13, marginTop: 2 }}>
                  {b.checkedInAt
                    ? `Checked-in at entrance: ${b.checkedInAt}`
                    : 'Show this digital pass at the entrance gate for instant verification.'}
                </p>
              </div>
              {b.checkedInAt ? (
                <span className="badge badge-confirmed">USED</span>
              ) : (
                <span className="badge badge-confirmed">VALID PASS</span>
              )}
            </div>

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Ticket QR Code"
                width="200"
                height="200"
                style={{ background: '#fff', padding: 8 }}
              />
            ) : (
              <LoadingState text="Generating secure QR…" />
            )}

            <div style={{ textAlign: 'center' }}>
              <b className="code">{b.ticketCode || b.id}</b>
              <p className="note" style={{ marginTop: 2 }}>
                Booking ID: {b.id}
              </p>
            </div>

            <div className="ticket-actions" style={{ justifyContent: 'center' }}>
              <Button size="sm" variant="outline" icon="download" onClick={handlePrint}>
                Print / Save Ticket
              </Button>
              <button className="btn btn-ghost btn-sm" onClick={copyToken}>
                <Icon name="copy" size={14} /> {copied ? 'Copied Token!' : 'Copy Token'}
              </button>
              <button
                className={`btn btn-sm ${b.reminderSet ? 'btn-primary' : 'btn-outline'}`}
                onClick={toggleReminder}
              >
                <Icon name="bell" size={14} /> {b.reminderSet ? 'Reminder Set' : 'Set Reminder'}
              </button>
            </div>
          </div>
        )}

        {b.status === 'EXPIRED' && (
          <div className="banner bad">
            The 10-minute hold expired. No payment was taken. Please browse events to book again.
          </div>
        )}

        {b.status === 'CANCELLED' && (
          <div className="banner bad">
            This booking was cancelled. Held seats have been released back to other attendees.
          </div>
        )}

        {b.status === 'REFUNDED' && (
          <div className="banner bad">
            Booking cancelled and payment refunded in accordance with the event cancellation policy.
          </div>
        )}

        {/* Cancellation Policy Banner */}
        {b.cancellationPolicy && (
          <p className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={14} /> <b>Policy:</b> {b.cancellationPolicy}
          </p>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {(b.status === 'HELD' || b.status === 'CONFIRMED') && (
            <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
              Cancel booking
            </Button>
          )}

          {isOrganizerOrVendor && (
            <Link to={`/organizer/scanner?eventId=${b.eventId}`} className="btn btn-outline btn-sm">
              <Icon name="scan" size={14} /> Organizer Scanner View
            </Link>
          )}

          <Link to="/bookings" className="btn btn-ghost btn-sm">
            ← All My Bookings
          </Link>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal open={payOpen} title="Complete Payment" onClose={() => setPayOpen(false)}>
        <p>This is a sandbox test payment environment. No real funds are deducted.</p>
        <div className="total-row">
          <span>Total Amount</span>
          <b>{formatPrice(b.amount)}</b>
        </div>
        <Button full disabled={busy} onClick={() => act(bookingService.pay, setPayOpen)}>
          {busy ? 'Verifying payment…' : 'Pay & Confirm Tickets'}
        </Button>
      </Modal>

      {/* Cancellation Modal */}
      <Modal open={cancelOpen} title="Cancel this booking?" onClose={() => setCancelOpen(false)}>
        <p>
          {b.status === 'CONFIRMED'
            ? `Your payment of ${formatPrice(b.amount)} will be refunded following the cancellation policy: "${b.cancellationPolicy}".`
            : 'Your held seats will be released immediately.'}
        </p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={() => setCancelOpen(false)}>
            Keep booking
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => act(bookingService.cancel, setCancelOpen)}>
            Yes, cancel booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}
