import { useEffect, useState } from 'react';
import EventSearch from '../components/events/EventSearch.jsx';
import CategoryFilter from '../components/events/CategoryFilter.jsx';
import EventCard from '../components/events/EventCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Icon from '../components/common/Icon.jsx';
import { eventService } from '../services/eventService.js';
import { useAuth } from '../state/AuthState.jsx';

const DISCOVERY_PRESETS = [
  { id: 'all', label: 'All Events', icon: 'ticket' },
  { id: 'free', label: 'Free Events (₹0)', icon: 'check' },
  { id: 'college', label: 'Popular College Events', icon: 'code' },
  { id: 'workshops', label: 'Upcoming Workshops', icon: 'tool' },
  { id: 'certs', label: 'With Certificates', icon: 'award' },
  { id: 'bengaluru', label: 'Nearby (Bengaluru)', icon: 'pin' },
  { id: 'trending', label: 'Trending', icon: 'star' },
  { id: 'recommended', label: 'Recommended For You', icon: 'heart' },
];

export default function EventsPage() {
  const { user } = useAuth();
  const [f, setF] = useState({
    q: '',
    category: 'All',
    days: 'all',
    city: 'All',
    price: 'any',
    hasCertificate: false,
    freeOnly: false,
  });
  const [activeDiscovery, setActiveDiscovery] = useState('all');
  const [events, setEvents] = useState(null);
  const [cities, setCities] = useState([]);
  const [recentViews, setRecentViews] = useState([]);
  const [error, setError] = useState('');

  const set = (k) => (v) => {
    setActiveDiscovery('');
    setF((p) => ({ ...p, [k]: v }));
  };

  useEffect(() => {
    eventService.cities().then(setCities).catch(() => {});
    setRecentViews(eventService.getRecentViews());
  }, []);

  const handleDiscoveryClick = (presetId) => {
    setActiveDiscovery(presetId);
    if (presetId === 'all') {
      setF({ q: '', category: 'All', days: 'all', city: 'All', price: 'any', hasCertificate: false, freeOnly: false });
    } else if (presetId === 'free') {
      setF((p) => ({ ...p, price: '0', freeOnly: true, category: 'All' }));
    } else if (presetId === 'college') {
      setF((p) => ({ ...p, category: 'College Technical', price: 'any', freeOnly: false }));
    } else if (presetId === 'workshops') {
      setF((p) => ({ ...p, category: 'Workshop', price: 'any', freeOnly: false }));
    } else if (presetId === 'certs') {
      setF((p) => ({ ...p, hasCertificate: true, freeOnly: false }));
    } else if (presetId === 'bengaluru') {
      setF((p) => ({ ...p, city: 'Bengaluru', price: 'any' }));
    } else if (presetId === 'trending') {
      setF((p) => ({ ...p, days: '30' }));
    } else if (presetId === 'recommended') {
      setF((p) => ({ ...p, category: user?.college ? 'College Technical' : 'All' }));
    }
  };

  useEffect(() => {
    let live = true;
    setEvents(null);
    eventService
      .list(f)
      .then((r) => live && setEvents(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [f]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            Discover <span>Amazing</span> Events
          </h1>
          <p>Book technical symposiums, hackathons, workshops, and concerts powered by AI</p>
        </div>
        <div className="hero-lights" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      <EventSearch
        q={f.q}
        onQ={set('q')}
        category={f.category}
        onCategory={set('category')}
        days={f.days}
        onDays={set('days')}
        city={f.city}
        onCity={set('city')}
        cities={cities}
      />

      {/* Advanced Discovery Quick Filter Bar */}
      <div className="discovery-bar" role="tablist" aria-label="Advanced discovery options">
        {DISCOVERY_PRESETS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={activeDiscovery === p.id}
            className={`discovery-pill ${activeDiscovery === p.id ? 'active' : ''}`}
            onClick={() => handleDiscoveryClick(p.id)}
          >
            <Icon name={p.icon} size={14} /> {p.label}
          </button>
        ))}
      </div>

      {/* Recently Viewed Events Carousel / Row */}
      {recentViews.length > 0 && f.q === '' && f.category === 'All' && (
        <section style={{ marginBottom: 24 }}>
          <div className="title-row" style={{ margin: '8px 0 12px' }}>
            <h3 style={{ fontSize: 18, color: 'var(--p-dark)' }}>
              <Icon name="clock" size={16} /> Recently Viewed
            </h3>
          </div>
          <div className="discovery-bar" style={{ paddingBottom: 4 }}>
            {recentViews.slice(0, 4).map((rv) => (
              <a
                key={rv.id}
                href={`/events/${rv.id}`}
                className="card"
                style={{
                  minWidth: 260,
                  maxWidth: 300,
                  padding: 12,
                  display: 'grid',
                  gap: 4,
                  fontSize: 14,
                  border: '1px solid var(--p-line)',
                }}
              >
                <span className="badge-branch" style={{ justifySelf: 'start' }}>
                  {rv.category}
                </span>
                <b style={{ color: 'var(--ink)' }}>{rv.title}</b>
                <small style={{ color: 'var(--muted)' }}>{rv.venue}</small>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="events-layout">
        <CategoryFilter
          category={f.category}
          onCategory={set('category')}
          price={f.price}
          onPrice={set('price')}
          hasCertificate={f.hasCertificate}
          onHasCertificate={set('hasCertificate')}
          onReset={() => {
            setActiveDiscovery('all');
            setF({ q: '', category: 'All', days: 'all', city: 'All', price: 'any', hasCertificate: false, freeOnly: false });
          }}
        />

        <section aria-live="polite">
          {error && <p className="field-error">{error}</p>}
          {!events && !error && <LoadingState text="Finding events…" />}
          {events && events.length === 0 && (
            <div className="card center-card">
              <h3>No events match your filters</h3>
              <p>Try clearing a filter or searching something else.</p>
            </div>
          )}
          {events && events.length > 0 && (
            <div className="events-grid">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
