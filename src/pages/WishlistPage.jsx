import { useEffect, useState } from 'react';
import EventCard from '../components/events/EventCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import { wishlistService } from '../services/wishlistService.js';
import { useAuth } from '../state/AuthState.jsx';

export default function WishlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (user?.id) {
      wishlistService.list(user.id).then(setItems);
    } else {
      setItems([]);
    }
  }, [user?.id]);

  if (!items) return <LoadingState text="Loading your wishlist…" />;

  return (
    <>
      <div className="title-row">
        <div>
          <h2 className="page-title">Saved Events & Wishlist</h2>
          <p className="note">Keep track of upcoming hackathons, workshops, and exhibitions you love</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card center-card" style={{ padding: '60px 20px' }}>
          <Icon name="heart" size={48} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          <h3>Your wishlist is currently empty</h3>
          <p>Click the heart icon on any event card to save it for quick access later.</p>
          <Button to="/events">Browse Events</Button>
        </div>
      ) : (
        <div className="events-grid">
          {items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  );
}

