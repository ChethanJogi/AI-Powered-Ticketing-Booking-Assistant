import { useState, useEffect } from 'react';
import Icon from '../common/Icon.jsx';
import Button from '../common/Button.jsx';
import { formatDate, formatPrice } from '../../services/eventService.js';
import { reviewService } from '../../services/reviewService.js';
import { useAuth } from '../../state/AuthState.jsx';

export default function EventDetails({ event, seatsLeft }) {
  const { user } = useAuth();
  const [reviewsData, setReviewsData] = useState({ reviews: [], average: 0, count: 0 });
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [shareToast, setShareToast] = useState('');

  useEffect(() => {
    reviewService.getForEvent(event.id).then(setReviewsData).catch(() => {});
  }, [event.id]);

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} on TicketAI!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall back to copy
      }
    }
    navigator.clipboard.writeText(window.location.href);
    setShareToast('Link copied to clipboard!');
    setTimeout(() => setShareToast(''), 2500);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a review.');
      return;
    }
    if (!newComment.trim()) return;
    setSubmittingReview(true);
    try {
      await reviewService.addReview(event.id, {
        rating: newRating,
        comment: newComment,
        user,
      });
      setNewComment('');
      // Refresh reviews
      const updated = await reviewService.getForEvent(event.id);
      setReviewsData(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const toneClass = `tone-${(event.category || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return (
    <section className="card details">
      <div className={`details-cover ${toneClass}`}>
        <span className="cat-pill static">
          {event.category}
          {event.eventType && ` · ${event.eventType}`}
        </span>
      </div>

      <div className="details-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h1>{event.title}</h1>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleShare}
            title="Share this event"
            style={{ flexShrink: 0 }}
          >
            <Icon name="share" size={15} /> Share
          </button>
        </div>

        {shareToast && (
          <p className="note ok" style={{ marginTop: 4 }}>
            {shareToast}
          </p>
        )}

        {/* College & Department / Instructor */}
        {event.college && (
          <p className="meta" style={{ fontWeight: 600, color: 'var(--p-dark)' }}>
            <Icon name="landmark" size={16} /> {event.college} {event.branch && `· ${event.branch}`}
          </p>
        )}

        {event.instructor && (
          <p className="meta">
            <Icon name="user" size={16} /> Instructor: <b>{event.instructor}</b>
          </p>
        )}

        {event.openingHours ? (
          <p className="meta">
            <Icon name="clock" size={16} /> Hours: <b>{event.openingHours}</b>
          </p>
        ) : (
          <p className="meta">
            <Icon name="calendar" size={16} /> {formatDate(event.date)}
          </p>
        )}

        <p className="meta">
          <Icon name="pin" size={16} /> {event.venue}, {event.city}
        </p>

        {/* Feature Badges */}
        <div className="card-badges" style={{ margin: '12px 0 16px' }}>
          {event.certificateAvailable && (
            <span className="badge-cert">
              <Icon name="award" size={13} /> Verified Certificate Provided
            </span>
          )}
          {event.prizePool && (
            <span className="badge-prize">
              <Icon name="star" size={13} /> Prize Pool: {event.prizePool}
            </span>
          )}
          {event.teamSize && (
            <span className="badge-branch">
              <Icon name="users" size={13} /> Team Size: {event.teamSize}
            </span>
          )}
          {event.duration && (
            <span className="badge-branch">
              <Icon name="clock" size={13} /> Duration: {event.duration}
            </span>
          )}
        </div>

        <p className="lead">{event.description}</p>

        {/* Topics Covered */}
        {Array.isArray(event.topics) && event.topics.length > 0 && (
          <div style={{ margin: '14px 0' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Topics & Skills Covered:</span>
            <div className="topics-wrap">
              {event.topics.map((t) => (
                <span key={t} className="topic-tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Visitor Guidelines (for museums) */}
        {Array.isArray(event.visitorInfo) && event.visitorInfo.length > 0 && (
          <div style={{ margin: '14px 0' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Visitor Guidelines & Amenities:</span>
            <ul style={{ paddingLeft: 20, margin: '6px 0', color: 'var(--muted)', fontSize: 14 }}>
              {event.visitorInfo.map((info, idx) => (
                <li key={idx}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Rulebook / Problem statement link */}
        {event.rulesUrl && (
          <p className="meta" style={{ margin: '10px 0' }}>
            <Icon name="info" size={16} />
            <a href={event.rulesUrl} target="_blank" rel="noopener noreferrer">
              View Official Rulebook & Guidelines ↗
            </a>
          </p>
        )}

        {/* Facts Bar */}
        <div className="facts" style={{ marginTop: 18 }}>
          <div>
            <small>Ticket / Entry Fee</small>
            <b>{formatPrice(event.price)}</b>
          </div>
          <div>
            <small>Seats Left</small>
            <b>{seatsLeft === null ? '…' : seatsLeft}</b>
          </div>
          <div>
            <small>Hold Window</small>
            <b>10 min</b>
          </div>
        </div>

        {/* Cancellation Policy Display */}
        {event.cancellationPolicy && (
          <div className="banner" style={{ marginTop: 16, background: '#FAF9FF', border: '1px solid var(--p-line)' }}>
            <p className="note" style={{ color: 'var(--ink)' }}>
              <Icon name="info" size={14} /> <b>Cancellation Policy:</b> {event.cancellationPolicy}
            </p>
          </div>
        )}

        {/* REVIEWS & RATINGS SECTION */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Attendee Reviews & Ratings</h3>
            {reviewsData.count > 0 && (
              <span className="badge badge-branch">
                ★ {reviewsData.average} / 5 ({reviewsData.count} review{reviewsData.count > 1 ? 's' : ''})
              </span>
            )}
          </div>

          {/* Add Review Form */}
          <form onSubmit={handleReviewSubmit} style={{ margin: '16px 0 24px', background: '#FAF9FF', padding: 16, borderRadius: 14 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Rate this event:</span>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`star-btn ${newRating >= s ? 'active' : ''}`}
                  onClick={() => setNewRating(s)}
                  aria-label={`Rate ${s} stars`}
                >
                  <Icon name="star" size={24} />
                </button>
              ))}
            </div>
            <textarea
              className="input"
              rows="2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? "Write your thoughts about this event..." : "Please log in to write a review"}
              disabled={!user || submittingReview}
            />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" size="sm" disabled={!user || submittingReview || !newComment.trim()}>
                {submittingReview ? 'Submitting…' : 'Submit Review'}
              </Button>
            </div>
          </form>

          {/* Reviews List */}
          {reviewsData.reviews.length === 0 ? (
            <p className="note">No reviews yet. Be the first to share your experience!</p>
          ) : (
            <div>
              {reviewsData.reviews.map((r) => (
                <div key={r.id} className="review-item">
                  <div className="review-head">
                    <b>{r.userName}</b>
                    <span className="stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={14}
                          style={{ color: i < r.rating ? '#F59E0B' : '#D1D5DB' }}
                        />
                      ))}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--ink)' }}>{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
