import { useEffect, useState } from 'react';
import EventCard from '../components/events/EventCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Icon from '../components/common/Icon.jsx';
import Button from '../components/common/Button.jsx';
import { eventService, WORKSHOP_TRACKS } from '../services/eventService.js';

export default function WorkshopsPage() {
  const [activeTrack, setActiveTrack] = useState('All');
  const [price, setPrice] = useState('any');
  const [hasCert, setHasCert] = useState(false);
  const [city, setCity] = useState('All');
  const [citiesList, setCitiesList] = useState([]);
  const [workshops, setWorkshops] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.cities().then(setCitiesList).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setWorkshops(null);
    eventService
      .list({
        category: 'Workshop',
        eventType: activeTrack,
        price,
        hasCertificate: hasCert,
        city,
      })
      .then((r) => live && setWorkshops(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [activeTrack, price, hasCert, city]);

  const resetFilters = () => {
    setActiveTrack('All');
    setPrice('any');
    setHasCert(false);
    setCity('All');
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            Hands-on <span>Workshops</span> & Bootcamps
          </h1>
          <p>
            Learn directly from industry leaders in AI, Cybersecurity, Cloud, Robotics and Full-Stack Development
          </p>
        </div>
        <div className="hero-lights" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      {/* Workshop Tracks Pills */}
      <div className="discovery-bar" style={{ marginTop: 18 }} role="tablist" aria-label="Workshop tracks">
        {WORKSHOP_TRACKS.map((track) => (
          <button
            key={track}
            role="tab"
            aria-selected={activeTrack === track}
            className={`discovery-pill ${activeTrack === track ? 'active' : ''}`}
            onClick={() => setActiveTrack(track)}
          >
            <Icon name="tool" size={14} /> {track}
          </button>
        ))}
      </div>

      <div className="events-layout">
        <aside className="filter card" aria-label="Filter workshops">
          <h3 className="filter-title">
            <Icon name="filter" size={18} /> Workshop Filters
          </h3>

          <h4>Track</h4>
          <select
            className="input"
            value={activeTrack}
            onChange={(e) => setActiveTrack(e.target.value)}
            aria-label="Filter by workshop track"
          >
            {WORKSHOP_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <h4>Pricing</h4>
          <select
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Filter by fee"
          >
            <option value="any">All Fees</option>
            <option value="0">Free Workshops (₹0)</option>
            <option value="0-500">Under ₹500</option>
            <option value="500-1000">₹500 – ₹1,000</option>
          </select>

          <h4>Location</h4>
          <select
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Filter by city"
          >
            <option value="All">All Locations / Online</option>
            {citiesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <h4>Certificates</h4>
          <label className="radio" style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={hasCert}
              onChange={(e) => setHasCert(e.target.checked)}
            />
            <span className="radio-dot" /> Certificate Included
          </label>

          <Button variant="outline" icon="refresh" full onClick={resetFilters}>
            Reset Filters
          </Button>
        </aside>

        <section aria-live="polite">
          {error && <p className="field-error">{error}</p>}
          {!workshops && !error && <LoadingState text="Loading workshops…" />}
          {workshops && workshops.length === 0 && (
            <div className="card center-card">
              <h3>No workshops match your criteria</h3>
              <p>Try clearing filters or switching tracks.</p>
              <Button onClick={resetFilters} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}
          {workshops && workshops.length > 0 && (
            <div className="events-grid">
              {workshops.map((w) => (
                <EventCard key={w.id} event={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

