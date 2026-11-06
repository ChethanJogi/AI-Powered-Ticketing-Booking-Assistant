import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import Button from '../common/Button.jsx';
import { formatDate, formatPrice } from '../../services/eventService.js';
import { wishlistService } from '../../services/wishlistService.js';
import { useAuth } from '../../state/AuthState.jsx';

const CAT_ICON = {
  Music: 'music',
  Comedy: 'mic',
  Conference: 'user',
  Culture: 'ticket',
  'College Technical': 'code',
  Workshop: 'tool',
  Museum: 'landmark',
};

export default function EventCard({ event }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (user?.id) {
      wishlistService.isWishlisted(user.id, event.id).then(setLiked).catch(() => {});
    }
  }, [user?.id, event.id]);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.id) {
      try {
        const res = await wishlistService.toggle(user.id, event.id);
        setLiked(res.saved);
      } catch {
        setLiked(!liked);
      }
    } else {
      setLiked(!liked);
    }
  };

  const toneClass = `tone-${(event.category || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const iconName = CAT_ICON[event.category] || 'ticket';

  return (
    <article className="event-card card">
      <Link to={`/events/${event.id}`} className={`cover ${toneClass}`} aria-label={event.title}>
        <span className="cover-art">
          <Icon name={iconName} size={64} />
        </span>
      </Link>
      <span className="cat-pill">
        <Icon name={iconName} size={13} /> {event.category}
      </span>
      <button
        className={`heart ${liked ? 'liked' : ''}`}
        onClick={toggleLike}
        aria-label="Save to wishlist"
        aria-pressed={liked}
      >
        <Icon name="heart" size={18} />
      </button>
      <div className="event-body">
        <h3>
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>
        
        {event.college && (
          <p className="meta" style={{ fontWeight: 600, color: 'var(--p-dark)' }}>
            <Icon name="landmark" size={15} /> {event.college} {event.branch && `· ${event.branch}`}
          </p>
        )}
        
        {event.instructor && (
          <p className="meta">
            <Icon name="user" size={15} /> {event.instructor}
          </p>
        )}

        {event.openingHours ? (
          <p className="meta">
            <Icon name="clock" size={15} /> {event.openingHours}
          </p>
        ) : (
          <p className="meta">
            <Icon name="calendar" size={15} /> {formatDate(event.date)}
          </p>
        )}

        <p className="meta">
          <Icon name="pin" size={15} /> {event.venue}, {event.city}
        </p>

        <p className="desc">{event.description}</p>

        <div className="card-badges" style={{ marginBottom: 12 }}>
          {event.certificateAvailable && (
            <span className="badge-cert">
              <Icon name="award" size={12} /> Certificate
            </span>
          )}
          {event.prizePool && (
            <span className="badge-prize">
              <Icon name="star" size={12} /> {event.prizePool}
            </span>
          )}
          {event.duration && (
            <span className="badge-branch">
              <Icon name="clock" size={12} /> {event.duration}
            </span>
          )}
        </div>

        <div className="event-foot">
          <b className="price">{formatPrice(event.price)}</b>
          <Button to={`/events/${event.id}`} size="sm" icon="ticket">
            {event.category === 'Museum' ? 'Explore & Book' : 'Book Tickets'}
          </Button>
        </div>
      </div>
    </article>
  );
}
