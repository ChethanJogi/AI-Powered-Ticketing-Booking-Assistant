import { useState } from 'react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { CATEGORIES } from '../../services/eventService.js';

const empty = { title: '', category: 'Music', date: '', venue: '', city: 'Bengaluru', price: '', capacity: '', description: '' };

export default function EventForm({ initial, onSubmit, submitLabel = 'Save event' }) {
  const [v, setV] = useState({ ...empty, ...initial });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!v.title.trim()) err.title = 'Title is required';
    if (!v.date) err.date = 'Pick a date and time';
    if (!v.venue.trim()) err.venue = 'Venue is required';
    if (!(Number(v.price) >= 0) || v.price === '') err.price = 'Enter a price (0 for free)';
    if (!(Number(v.capacity) > 0)) err.capacity = 'Capacity must be at least 1';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    try { await onSubmit(v); } finally { setSaving(false); }
  };

  return (
    <form className="card form-card grid-2" onSubmit={submit} noValidate>
      <Input label="Title" value={v.title} onChange={set('title')} error={errors.title} />
      <Input label="Category" as="select" value={v.category} onChange={set('category')}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </Input>
      <Input label="Date and time" type="datetime-local" value={v.date} onChange={set('date')} error={errors.date} />
      <Input label="Venue" value={v.venue} onChange={set('venue')} error={errors.venue} />
      <Input label="City" value={v.city} onChange={set('city')} />
      <Input label="Ticket price (₹)" type="number" min="0" value={v.price} onChange={set('price')} error={errors.price} />
      <Input label="Total seats" type="number" min="1" value={v.capacity} onChange={set('capacity')} error={errors.capacity} />
      <div className="span-2"><Input label="Description" as="textarea" rows="3" value={v.description} onChange={set('description')} /></div>
      <div className="span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</Button></div>
    </form>
  );
}
