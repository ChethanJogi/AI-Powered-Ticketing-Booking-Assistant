import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthState.jsx';

export default function VendorRoute() {
  const { user, isVendor } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isVendor) return <Navigate to="/events" replace />;
  return <Outlet />;
}
