import { useEffect, useState } from 'react';
import EventCard from '../components/events/EventCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Icon from '../components/common/Icon.jsx';
import Button from '../components/common/Button.jsx';
import { eventService, MUSEUM_CATEGORIES } from '../services/eventService.js';

export default function MuseumsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [city, setCity] = useState('All');
  const [citiesList, setCitiesList] = useState([]);
  const [search, setSearch] = useState('');
  const [museums, setMuseums] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    eventService.cities().then(setCitiesList).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setMuseums(null);
    eventService
      .list({
        category: 'Museum',
        eventType: activeCategory,
        city,
        q: search,
      })
      .then((r) => live && setMuseums(r))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [activeCategory, city, search]);

  const resetAll = () => {
    setActiveCategory('All');
    setCity('All');
    setSearch('');
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1>
            Museum & <span>Tourism</span> Explorer
          </h1>
          <p>
            Explore renowned science museums, art galleries, aviation heritage centers and historic palaces
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

      {/* Museum Sub-category Pills */}
      <div className="discovery-bar" style={{ marginTop: 18 }} role="tablist" aria-label="Museum categories">
        {MUSEUM_CATEGORIES.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={activeCategory === m}
            className={`discovery-pill ${activeCategory === m ? 'active' : ''}`}
            onClick={() => setActiveCategory(m)}
          >
            <Icon name="landmark" size={14} /> {m}
          </button>
        ))}
      </div>

      <div className="events-layout">
        <aside className="filter card" aria-label="Filter museums">
          <h3 className="filter-title">
            <Icon name="filter" size={18} /> Location & Type
          </h3>

          <h4>Search Museum / Place</h4>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search museum or exhibits…"
          />

          <h4>Category</h4>
          <select
            className="input"
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            aria-label="Filter by museum category"
          >
            {MUSEUM_CATEGORIES.map((c) => (
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

          <Button variant="outline" icon="refresh" full onClick={resetAll}>
            Reset Filters
          </Button>
        </aside>

        <section aria-live="polite">
          {error && <p className="field-error">{error}</p>}
          {!museums && !error && <LoadingState text="Loading museums & heritage spots…" />}
          {museums && museums.length === 0 && (
            <div className="card center-card">
              <h3>No museums found</h3>
              <p>Try clearing your search terms or selecting another category.</p>
              <Button onClick={resetAll} variant="outline">
                Clear Filters
              </Button>
            </div>
          )}
          {museums && museums.length > 0 && (
            <div className="events-grid">
              {museums.map((m) => (
                <EventCard key={m.id} event={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

