import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthState.jsx';
import Icon from '../common/Icon.jsx';
import Button from '../common/Button.jsx';

export default function Navbar() {
  const { user, isVendor, isOrganizer, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const link = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/events" className="brand">
          <span className="brand-logo">
            <Icon name="ticket" size={20} />
          </span>
          <span className="brand-name">
            Ticket<b>AI</b>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          <NavLink to="/events" end className={link}>
            <Icon name="ticket" size={16} /> Events
          </NavLink>
          <NavLink to="/technical-events" className={link}>
            <Icon name="code" size={16} /> Tech Events
          </NavLink>
          <NavLink to="/workshops" className={link}>
            <Icon name="tool" size={16} /> Workshops
          </NavLink>
          <NavLink to="/museums" className={link}>
            <Icon name="landmark" size={16} /> Museums
          </NavLink>
          <NavLink to="/calendar" className={link}>
            <Icon name="calendar" size={16} /> Calendar
          </NavLink>
          {user && (
            <NavLink to="/bookings" className={link}>
              My Bookings
            </NavLink>
          )}
          {isOrganizer && (
            <NavLink to="/organizer" className={link}>
              Organizer Portal
            </NavLink>
          )}
          {isVendor && !isOrganizer && (
            <NavLink to="/vendor" className={link}>
              Vendor Dashboard
            </NavLink>
          )}
        </nav>

        <div className="nav-right">
          {user ? (
            <>
              <Link to="/wishlist" className="icon-btn" aria-label="Saved events / Wishlist" title="My Wishlist">
                <Icon name="heart" size={20} />
              </Link>
              <button className="icon-btn bell" aria-label="Notifications" title="Notifications">
                <Icon name="bell" size={20} />
                <i className="dot" />
              </button>
              <div className="avatar-wrap">
                <button
                  className="avatar"
                  onClick={() => setOpen((o) => !o)}
                  aria-label="Account menu"
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                <Icon name="chevron" size={14} />
                {open && (
                  <div className="menu fade-up" onMouseLeave={() => setOpen(false)}>
                    <div className="menu-name">
                      {user.name}
                      <small>{user.email}</small>
                      {user.college && <small style={{ color: 'var(--p)' }}>{user.college}</small>}
                    </div>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/profile');
                      }}
                    >
                      <Icon name="user" size={14} style={{ marginRight: 8 }} /> Profile
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/wishlist');
                      }}
                    >
                      <Icon name="heart" size={14} style={{ marginRight: 8 }} /> My Wishlist
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/certificates');
                      }}
                    >
                      <Icon name="award" size={14} style={{ marginRight: 8 }} /> My Certificates
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate('/bookings');
                      }}
                    >
                      <Icon name="ticket" size={14} style={{ marginRight: 8 }} /> My Bookings
                    </button>
                    {isOrganizer && (
                      <>
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate('/organizer');
                          }}
                        >
                          <Icon name="code" size={14} style={{ marginRight: 8 }} /> Organizer Dashboard
                        </button>
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate('/organizer/scanner');
                          }}
                        >
                          <Icon name="scan" size={14} style={{ marginRight: 8 }} /> QR Entrance Scanner
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setOpen(false);
                        logout();
                        navigate('/events');
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button to="/register" size="sm">
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
