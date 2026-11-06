import Icon from '../common/Icon.jsx';
import { CATEGORIES } from '../../services/eventService.js';

export default function EventSearch({ q, onQ, category, onCategory, days, onDays, city, onCity, cities }) {
  return (
    <div className="search-bar card">
      <label className="search-input">
        <Icon name="search" size={20} />
        <input value={q} onChange={(e) => onQ(e.target.value)} placeholder="Search by name, category or venue…" aria-label="Search events" />
      </label>
      <label className="pill-select primary">
        <select value={category} onChange={(e) => onCategory(e.target.value)} aria-label="Category">
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Icon name="chevron" size={14} />
      </label>
      <label className="pill-select">
        <Icon name="calendar" size={16} />
        <select value={days} onChange={(e) => onDays(e.target.value)} aria-label="Dates">
          <option value="all">All Dates</option>
          <option value="30">Next 30 days</option>
          <option value="90">Next 90 days</option>
        </select>
        <Icon name="chevron" size={14} />
      </label>
      <label className="pill-select">
        <Icon name="pin" size={16} />
        <select value={city} onChange={(e) => onCity(e.target.value)} aria-label="Location">
          <option value="All">All Locations</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Icon name="chevron" size={14} />
      </label>
    </div>
  );
}
