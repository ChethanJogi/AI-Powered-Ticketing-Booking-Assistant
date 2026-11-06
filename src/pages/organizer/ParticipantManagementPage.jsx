import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import Button from '../../components/common/Button.jsx';
import Icon from '../../components/common/Icon.jsx';
import { eventService } from '../../services/eventService.js';
import { bookingService } from '../../services/bookingService.js';
import { StatusBadge } from '../MyBookingsPage.jsx';

export default function ParticipantManagementPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([eventService.get(id), bookingService.listForEvent(id)])
      .then(([ev, list]) => {
        setEvent(ev);
        setParticipants(list);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="card center-card">
        <h3>{error}</h3>
        <Button to="/organizer" variant="outline">
          Back to Organizer Dashboard
        </Button>
      </div>
    );
  }

  if (!event || !participants) return <LoadingState text="Loading participant roster…" />;

  const filtered = participants.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.userName || '').toLowerCase().includes(term) ||
      (p.userEmail || '').toLowerCase().includes(term) ||
      (p.teamName || '').toLowerCase().includes(term) ||
      (p.id || '').toLowerCase().includes(term)
    );
  });

  const exportCSV = () => {
    const headers = ['Booking ID', 'Participant Name', 'Email', 'Team Name', 'Tickets', 'Amount', 'Status', 'Checked In At'];
    const rows = filtered.map((p) => [
      p.id,
      `"${p.userName || ''}"`,
      `"${p.userEmail || ''}"`,
      `"${p.teamName || 'Individual'}"`,
      p.qty,
      p.amount,
      p.status,
      `"${p.checkedInAt || 'Not Checked In'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmedCount = participants.filter((p) => p.status === 'CONFIRMED').length;
  const checkedInCount = participants.filter((p) => p.checkedInAt).length;

  return (
    <>
      <div className="title-row">
        <div>
          <h2 className="page-title">{event.title} – Participants</h2>
          <p className="meta">
            <Icon name="landmark" size={15} /> {event.college || event.venue} ·{' '}
            <b>{confirmedCount} confirmed</b> · <b>{checkedInCount} checked-in</b>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={exportCSV} variant="outline" icon="download">
            Export CSV
          </Button>
          <Button to={`/organizer/scanner?eventId=${event.id}`} icon="scan">
            Open Event Scanner
          </Button>
        </div>
      </div>

      <div className="card table-card">
        <div className="title-row" style={{ flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 360 }}
            placeholder="Search by student name, email, team or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="note">
            Showing {filtered.length} of {participants.length} entries
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="note" style={{ padding: '20px 0' }}>
            No registered participants found matching search.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Attendee Name</th>
                <th>Team / Additional Members</th>
                <th>Seats</th>
                <th>Status</th>
                <th>Check-in Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.id}</code>
                  </td>
                  <td>
                    <b>{p.userName}</b>
                    {p.userEmail && (
                      <>
                        <br />
                        <small style={{ color: 'var(--muted)' }}>{p.userEmail}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {p.teamName ? <b>{p.teamName}</b> : <i>Individual</i>}
                    {Array.isArray(p.attendees) && p.attendees.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {p.attendees.join(', ')}
                      </div>
                    )}
                  </td>
                  <td>{p.qty}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    {p.checkedInAt ? (
                      <span className="badge badge-confirmed" title={`Checked in: ${p.checkedInAt}`}>
                        <Icon name="check" size={12} /> {p.checkedInAt}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#F1F5F9', color: '#64748B' }}>
                        Pending Check-in
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link to="/organizer" className="btn btn-ghost">
          ← Back to Organizer Dashboard
        </Link>
      </div>
    </>
  );
}

