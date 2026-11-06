import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthState.jsx';

export default function OrganizerRoute() {
  const { user, isVendor } = useAuth();
  const isOrganizer = user?.role === 'organizer' || isVendor;
  if (!user) return <Navigate to="/login" replace />;
  if (!isOrganizer) return <Navigate to="/events" replace />;
  return <Outlet />;
}

