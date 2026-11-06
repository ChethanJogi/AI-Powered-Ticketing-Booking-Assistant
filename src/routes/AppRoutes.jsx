import { Routes, Route, Navigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout.jsx';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import VendorRoute from './VendorRoute.jsx';
import OrganizerRoute from './OrganizerRoute.jsx';
import AdminRoute from './AdminRoute.jsx';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx';
import AdminVendorsPage from '../pages/admin/AdminVendorsPage.jsx';
import AdminEventsPage from '../pages/admin/AdminEventsPage.jsx';
import AdminBookingsPage from '../pages/admin/AdminBookingsPage.jsx';
import AdminReportsPage from '../pages/admin/AdminReportsPage.jsx';
import AdminAuditPage from '../pages/admin/AdminAuditPage.jsx';
import AdminScannerPage from '../pages/admin/AdminScannerPage.jsx';

import EventsPage from '../pages/EventsPage.jsx';
import EventDetailsPage from '../pages/EventDetailsPage.jsx';
import CollegeTechEventsPage from '../pages/CollegeTechEventsPage.jsx';
import WorkshopsPage from '../pages/WorkshopsPage.jsx';
import MuseumsPage from '../pages/MuseumsPage.jsx';
import CalendarPage from '../pages/CalendarPage.jsx';
import WishlistPage from '../pages/WishlistPage.jsx';
import CertificatesPage from '../pages/CertificatesPage.jsx';

import LoginPage from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import MyBookingsPage from '../pages/MyBookingsPage.jsx';
import BookingDetailsPage from '../pages/BookingDetailsPage.jsx';

// Organizer & Vendor Pages
import OrganizerDashboardPage from '../pages/organizer/OrganizerDashboardPage.jsx';
import CreateCollegeEventPage from '../pages/organizer/CreateCollegeEventPage.jsx';
import ParticipantManagementPage from '../pages/organizer/ParticipantManagementPage.jsx';
import OrganizerScannerPage from '../pages/organizer/OrganizerScannerPage.jsx';

import VendorDashboardPage from '../pages/vendor/VendorDashboardPage.jsx';
import MyEventsPage from '../pages/vendor/MyEventsPage.jsx';
import CreateEventPage from '../pages/vendor/CreateEventPage.jsx';
import EditEventPage from '../pages/vendor/EditEventPage.jsx';
import EventBookingsPage from '../pages/vendor/EventBookingsPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* ADMIN PORTAL - separate from the customer layout */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/vendors" element={<AdminVendorsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/scanner" element={<AdminScannerPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />
        </Route>
      </Route>

      <Route element={<PageLayout />}>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />

        {/* Feature Hubs */}
        <Route path="/technical-events" element={<CollegeTechEventsPage />} />
        <Route path="/workshops" element={<WorkshopsPage />} />
        <Route path="/museums" element={<MuseumsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* User Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        </Route>

        {/* College Organizer Portal */}
        <Route element={<OrganizerRoute />}>
          <Route path="/organizer" element={<OrganizerDashboardPage />} />
          <Route path="/organizer/events/new" element={<CreateCollegeEventPage />} />
          <Route path="/organizer/events/:id/participants" element={<ParticipantManagementPage />} />
          <Route path="/organizer/scanner" element={<OrganizerScannerPage />} />
        </Route>

        {/* Vendor Routes */}
        <Route element={<VendorRoute />}>
          <Route path="/vendor" element={<VendorDashboardPage />} />
          <Route path="/vendor/events" element={<MyEventsPage />} />
          <Route path="/vendor/events/new" element={<CreateEventPage />} />
          <Route path="/vendor/events/:id/edit" element={<EditEventPage />} />
          <Route path="/vendor/events/:id/bookings" element={<EventBookingsPage />} />
        </Route>

        <Route
          path="*"
          element={
            <div className="card center-card">
              <h2>Page not found</h2>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
