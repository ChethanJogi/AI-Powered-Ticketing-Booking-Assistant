import '../../styles/admin.css';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthState.jsx';

const navigation = [
  { name: 'Dashboard', path: '/admin', icon: '▦' },
  { name: 'Users', path: '/admin/users', icon: '♙' },
  { name: 'Vendors', path: '/admin/vendors', icon: '▣' },
  { name: 'Events', path: '/admin/events', icon: '▤' },
  { name: 'Bookings', path: '/admin/bookings', icon: '▧' },
  { name: 'QR Scanner', path: '/admin/scanner', icon: '⌗' },
  { name: 'Reports', path: '/admin/reports', icon: '▥' },
  { name: 'Audit Log', path: '/admin/audit', icon: '≡' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">T</div>
          <div>
            <h2>TicketAI</h2>
            <span>ADMIN PORTAL</span>
          </div>
        </div>

        <div className="admin-nav-heading">MAIN MENU</div>
        <nav className="admin-navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user-info">
            <div className="admin-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <strong>{user?.name || 'Administrator'}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar-label">TICKETAI / ADMINISTRATION</span>
            <h3>Admin Portal</h3>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-status">● System Administrator</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
