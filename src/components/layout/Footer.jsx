import { Link } from 'react-router-dom';
import Icon from '../common/Icon.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-logo sm"><Icon name="ticket" size={14} /></span>
          <b>TicketAI</b>
          <small>Book • Explore • Enjoy</small>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/events">About</Link>
          <Link to="/events">Help</Link>
          <Link to="/events">Contact</Link>
        </nav>
        <small>© 2026 TicketAI. All rights reserved.</small>
      </div>
    </footer>
  );
}
