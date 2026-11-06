import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input.jsx';
import Button from '../../components/common/Button.jsx';
import {
  eventService,
  CATEGORIES,
  TECH_EVENT_TYPES,
  BRANCHES,
} from '../../services/eventService.js';
import { useAuth } from '../../state/AuthState.jsx';

export default function CreateCollegeEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [v, setV] = useState({
    title: '',
    category: 'College Technical',
    eventType: 'Hackathons',
    college: user?.college || 'RV College of Engineering',
    branch: 'Computer Science (CSE)',
    date: '',
    venue: '',
    city: 'Bengaluru',
    price: '0',
    capacity: '150',
    description: '',
    teamSize: '2-4 members',
    prizePool: '₹50,000',
    certificateAvailable: true,
    rulesUrl: '',
    posterUrl: '',
    cancellationPolicy: 'Free cancellation up to 24 hours before the event',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV({ ...v, [k]: val });
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!v.title.trim()) err.title = 'Event title is required';
    if (!v.college.trim()) err.college = 'College/Institution name is required';
    if (!v.date) err.date = 'Pick a date and time';
    if (!v.venue.trim()) err.venue = 'Venue or hall name is required';
    if (v.price === '' || Number(v.price) < 0) err.price = 'Enter valid fee (0 for free)';
    if (!Number(v.capacity) || Number(v.capacity) < 1) err.capacity = 'Capacity must be at least 1';

    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    try {
      await eventService.create({
        ...v,
        vendorId: user.id,
      });
      navigate('/organizer');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="page-title">Publish College Technical Event</h2>
      <p className="note" style={{ marginBottom: 16 }}>
        Host a competition, hackathon, workshop or symposium for students
      </p>

      <form className="card form-card grid-2" onSubmit={submit} noValidate>
        <div className="span-2">
          <Input
            label="Event Title"
            value={v.title}
            onChange={set('title')}
            placeholder="e.g. HackIndia 2026: 36h National Hackathon"
            error={errors.title}
          />
        </div>

        <Input label="Category" as="select" value={v.category} onChange={set('category')}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Input>

        <Input label="Technical Competition Type" as="select" value={v.eventType} onChange={set('eventType')}>
          {TECH_EVENT_TYPES.filter((t) => t !== 'All').map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Input>

        <Input
          label="College / Host University"
          value={v.college}
          onChange={set('college')}
          placeholder="e.g. RV College of Engineering"
          error={errors.college}
        />

        <Input label="Target Branch / Department" as="select" value={v.branch} onChange={set('branch')}>
          {BRANCHES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Input>

        <Input
          label="Date and Start Time"
          type="datetime-local"
          value={v.date}
          onChange={set('date')}
          error={errors.date}
        />

        <Input
          label="Venue / Campus Building"
          value={v.venue}
          onChange={set('venue')}
          placeholder="e.g. Central Auditorium / CSE Lab 3"
          error={errors.venue}
        />

        <Input label="City" value={v.city} onChange={set('city')} />

        <Input
          label="Registration Fee per Ticket / Team (₹0 for Free)"
          type="number"
          min="0"
          value={v.price}
          onChange={set('price')}
          error={errors.price}
        />

        <Input
          label="Max Capacity (Seats / Teams)"
          type="number"
          min="1"
          value={v.capacity}
          onChange={set('capacity')}
          error={errors.capacity}
        />

        <Input
          label="Team Size"
          value={v.teamSize}
          onChange={set('teamSize')}
          placeholder="e.g. 2-4 members or Individual"
        />

        <Input
          label="Prize Pool / Awards"
          value={v.prizePool}
          onChange={set('prizePool')}
          placeholder="e.g. ₹1,00,000 + Goodies"
        />

        <Input
          label="Rulebook / Problem Statement URL"
          value={v.rulesUrl}
          onChange={set('rulesUrl')}
          placeholder="https://yourcollege.edu/hackathon/rules"
        />

        <Input
          label="Event Poster Image URL"
          value={v.posterUrl}
          onChange={set('posterUrl')}
          placeholder="https://example.com/poster.jpg"
        />

        <Input
          label="Cancellation Policy"
          value={v.cancellationPolicy}
          onChange={set('cancellationPolicy')}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <label className="radio">
            <input
              type="checkbox"
              checked={v.certificateAvailable}
              onChange={set('certificateAvailable')}
            />
            <span className="radio-dot" /> Verified Participation Certificate Provided
          </label>
        </div>

        <div className="span-2">
          <Input
            label="Event Description & Eligibility"
            as="textarea"
            rows="4"
            value={v.description}
            onChange={set('description')}
            placeholder="Describe the event format, eligibility criteria, stages, judging parameters, and requirements..."
          />
        </div>

        <div className="span-2" style={{ display: 'flex', gap: 12 }}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Publishing Event…' : 'Publish College Event'}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/organizer')}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}

