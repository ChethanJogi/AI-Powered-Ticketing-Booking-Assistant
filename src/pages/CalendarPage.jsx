import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon.jsx';
import Button from '../components/common/Button.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { eventService, formatPrice, formatDate } from '../services/eventService.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 1)); // Default Nov 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 10, 28)); // Default 28 Nov 2026
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => {
    eventService.list({ category: catFilter }).then((list) => {
      setEvents(list);
      setLoading(false);
    });
  }, [catFilter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar math
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Find events on a given date (matching YYYY-MM-DD)
  const getEventsOnDay = (day) => {
    const targetIsoPrefix = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date && e.date.startsWith(targetIsoPrefix));
  };

  const selectedIsoPrefix = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayEvents = events.filter((e) => e.date && e.date.startsWith(selectedIsoPrefix));

  // Helper to generate and download universal .ics iCalendar file
  const downloadIcs = (event) => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 3 * 3600 * 1000); // 3 hours default
    const formatIcsTime = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TicketAI//Event Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@ticketai.in`,
      `DTSTAMP:${formatIcsTime(new Date())}`,
      `DTSTART:${formatIcsTime(start)}`,
      `DTEND:${formatIcsTime(end)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, ' ')}`,
      `LOCATION:${event.venue}, ${event.city}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Calendar URL generator
  const getGoogleCalendarUrl = (event) => {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 3 * 3600 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(`${event.description}\n\nBooked via TicketAI`);
    const location = encodeURIComponent(`${event.venue}, ${event.city}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  };

  if (loading) return <LoadingState text="Loading events calendar…" />;

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            Event <span>Calendar</span>
          </h1>
          <p>Browse events by schedule, pick a date, and sync your favorite events to your personal calendar</p>
        </div>
        <div className="hero-lights" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="discovery-bar" style={{ marginTop: 18 }} role="tablist" aria-label="Filter events by category">
        {['All', 'College Technical', 'Workshop', 'Museum', 'Music', 'Comedy', 'Conference'].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={catFilter === cat}
            className={`discovery-pill ${catFilter === cat ? 'active' : ''}`}
            onClick={() => setCatFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="calendar-wrap">
        {/* Month Grid Card */}
        <div className="card calendar-card">
          <div className="calendar-nav">
            <h2>
              {MONTH_NAMES[month]} {year}
            </h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" onClick={prevMonth} aria-label="Previous month">
                <Icon name="chevronLeft" size={20} />
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
              >
                Today
              </button>
              <button className="icon-btn" onClick={nextMonth} aria-label="Next month">
                <Icon name="chevronRight" size={20} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="cal-weekday">
                {w}
              </div>
            ))}

            {/* Empty offset days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="cal-day empty" />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === month &&
                selectedDate.getDate() === day;
              const isToday =
                new Date().getFullYear() === year &&
                new Date().getMonth() === month &&
                new Date().getDate() === day;
              const dayEvents = getEventsOnDay(day);

              return (
                <div
                  key={day}
                  className={`cal-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  role="button"
                  tabIndex={0}
                  aria-label={`${day} ${MONTH_NAMES[month]}, ${dayEvents.length} events`}
                >
                  <span>{day}</span>
                  {dayEvents.length > 0 && <span className="cal-dot" title={`${dayEvents.length} event(s)`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Schedule Panel */}
        <aside className="card schedule-panel">
          <div className="title-row" style={{ margin: 0 }}>
            <div>
              <h3>Schedule</h3>
              <p className="note">
                {selectedDate.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span className="badge badge-branch">
              {selectedDayEvents.length} Event{selectedDayEvents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--muted)' }}>
              <p>No events scheduled for this date.</p>
              <small>Click on any date marked with a purple dot to view scheduled events.</small>
            </div>
          ) : (
            <div className="stack">
              {selectedDayEvents.map((ev) => (
                <article key={ev.id} className="schedule-event">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="cat-pill static" style={{ position: 'static' }}>
                      {ev.category}
                    </span>
                    <b style={{ color: 'var(--p-dark)' }}>{formatPrice(ev.price)}</b>
                  </div>
                  <h4 style={{ fontSize: 16 }}>
                    <Link to={`/events/${ev.id}`}>{ev.title}</Link>
                  </h4>
                  <p className="meta" style={{ fontSize: 13 }}>
                    <Icon name="clock" size={14} /> {formatDate(ev.date)}
                  </p>
                  <p className="meta" style={{ fontSize: 13 }}>
                    <Icon name="pin" size={14} /> {ev.venue}, {ev.city}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <Button to={`/events/${ev.id}`} size="sm" icon="ticket">
                      View & Book
                    </Button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => downloadIcs(ev)}
                      title="Download .ics calendar file"
                    >
                      <Icon name="download" size={14} /> .ics
                    </button>
                    <a
                      href={getGoogleCalendarUrl(ev)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      title="Add directly to Google Calendar"
                    >
                      <Icon name="calendar" size={14} /> Google Cal
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

