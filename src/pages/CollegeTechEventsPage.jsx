import { useEffect, useState } from 'react';
import EventCard from '../components/events/EventCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Icon from '../components/common/Icon.jsx';
import Button from '../components/common/Button.jsx';
import {
  eventService,
  TECH_EVENT_TYPES,
  BRANCHES,
} from '../services/eventService.js';

export default function CollegeTechEventsPage() {
  const [activeType, setActiveType] = useState('All');
  const [branch, setBranch] = useState('All Branches');
  const [college, setCollege] = useState('All');
  const [city, setCity] = useState('All');
  const [price, setPrice] = useState('any');
  const [days, setDays] = useState('all');
  const [collegesList, setCollegesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.colleges().then(setCollegesList).catch(() => {});
    eventService.cities().then(setCitiesList).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setEvents(null);
    eventService
      .list({
        category: 'College Technical',
        eventType: activeType,
        branch: branch === 'All Branches' ? 'All' : branch,
        college,
        city,
        price,
        days,
      })
      .then((r) => live && setEvents(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [activeType, branch, college, city, price, days]);

  const resetAll = () => {
    setActiveType('All');
    setBranch('All Branches');
    setCollege('All');
    setCity('All');
    setPrice('any');
    setDays('all');
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            College <span>Technical Events</span> Hub
          </h1>
          <p>
            Discover hackathons, coding duels, robotics arenas & technical symposiums across top colleges
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

      {/* Discovery Sub-category Navigation Pills */}
      <div className="discovery-bar" style={{ marginTop: 18 }} role="tablist" aria-label="Technical event types">
        {TECH_EVENT_TYPES.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={activeType === t}
            className={`discovery-pill ${activeType === t ? 'active' : ''}`}
            onClick={() => setActiveType(t)}
          >
            <Icon name="code" size={14} /> {t}
          </button>
        ))}
      </div>

      <div className="events-layout">
        {/* Dedicated Filters for College Tech Events */}
        <aside className="filter card" aria-label="Filter college technical events">
          <h3 className="filter-title">
            <Icon name="filter" size={18} /> Tech Filters
          </h3>

          <h4>Engineering Branch</h4>
          <select
            className="input"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            aria-label="Filter by branch"
          >
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <h4>College / University</h4>
          <select
            className="input"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            aria-label="Filter by college"
          >
            <option value="All">All Colleges</option>
            {collegesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <h4>City</h4>
          <select
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Filter by city"
          >
            <option value="All">All Cities</option>
            {citiesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <h4>Registration Fee</h4>
          <select
            className="input"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Filter by fee"
          >
            <option value="any">Any Fee</option>
            <option value="0">Free Entry (₹0)</option>
            <option value="0-200">Under ₹200</option>
            <option value="0-500">Under ₹500</option>
          </select>

          <h4>Date Horizon</h4>
          <select
            className="input"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-label="Filter by dates"
          >
            <option value="all">All Dates</option>
            <option value="15">Next 15 days</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
          </select>

          <Button variant="outline" icon="refresh" full onClick={resetAll}>
            Reset Filters
          </Button>
        </aside>

        <section aria-live="polite">
          {error && <p className="field-error">{error}</p>}
          {!events && !error && <LoadingState text="Loading technical events…" />}
          {events && events.length === 0 && (
            <div className="card center-card">
              <h3>No technical events found</h3>
              <p>Try resetting filters or exploring other technical tracks.</p>
              <Button onClick={resetAll} variant="outline">
                Clear Filters
              </Button>
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

