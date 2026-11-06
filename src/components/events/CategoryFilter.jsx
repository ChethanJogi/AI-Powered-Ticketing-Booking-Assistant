import Icon from '../common/Icon.jsx';
import Button from '../common/Button.jsx';
import { CATEGORIES } from '../../services/eventService.js';

export default function CategoryFilter({
  category,
  onCategory,
  price,
  onPrice,
  hasCertificate,
  onHasCertificate,
  onReset,
}) {
  return (
    <aside className="filter card" aria-label="Filter events">
      <h3 className="filter-title">
        <Icon name="filter" size={18} /> Filter Events
      </h3>
      <h4>Category</h4>
      <div className="radios">
        {['All', ...CATEGORIES].map((c) => (
          <label key={c} className="radio">
            <input
              type="radio"
              name="category"
              checked={category === c}
              onChange={() => onCategory(c)}
            />
            <span className="radio-dot" /> {c}
          </label>
        ))}
      </div>

      <h4>Price Range</h4>
      <select
        className="input"
        value={price}
        onChange={(e) => onPrice(e.target.value)}
        aria-label="Price range"
      >
        <option value="any">Any Price</option>
        <option value="0">Free (₹0)</option>
        <option value="0-500">Under ₹500</option>
        <option value="500-1000">₹500 – ₹1,000</option>
        <option value="1000-2000">₹1,000 – ₹2,000</option>
        <option value="2000-">Above ₹2,000</option>
      </select>

      {onHasCertificate && (
        <label className="radio" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={!!hasCertificate}
            onChange={(e) => onHasCertificate(e.target.checked)}
          />
          <span className="radio-dot" /> With Certificate
        </label>
      )}

      <Button variant="outline" icon="refresh" full onClick={onReset}>
        Reset Filters
      </Button>
    </aside>
  );
}
