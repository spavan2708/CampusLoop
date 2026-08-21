import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from '../../../frontend/src/layouts/DashboardLayout.jsx'
import LoginPage from '../../../frontend/src/pages/LoginPage.jsx'
import NotificationsPage from '../../../frontend/src/pages/NotificationsPage.jsx'
import NotificationPreferencesPage from '../../../frontend/src/pages/NotificationPreferencesPage.jsx'
import ProfilePage from '../../../frontend/src/pages/ProfilePage.jsx'
import UnauthorizedPage from '../../../frontend/src/pages/UnauthorizedPage.jsx'
import NotFoundPage from '../../../frontend/src/pages/NotFoundPage.jsx'
import ProtectedRoute from '../../../frontend/src/components/ProtectedRoute.jsx'
import PageExperience from '../../../frontend/src/components/PageExperience.jsx'
import { AdminClubDetail, AdminClubs, AdminCreateClub, AdminDashboard, AdminEventDetail, AdminEvents, AdminLanding, AdminUsers } from './pages/AdminPages.jsx'
export default function App() { return <><PageExperience /><Routes>
  <Route path="/" element={<AdminLanding />} /><Route path="/login" element={<LoginPage role="central_admin" />} /><Route path="/unauthorized" element={<UnauthorizedPage />} />
  <Route element={<ProtectedRoute allowedRoles={['central_admin']} />}><Route element={<DashboardLayout />}>
    <Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/clubs" element={<AdminClubs />} /><Route path="/admin/clubs/new" element={<AdminCreateClub />} /><Route path="/admin/clubs/:clubId" element={<AdminClubDetail />} /><Route path="/admin/events" element={<AdminEvents />} /><Route path="/admin/events/:eventId" element={<AdminEventDetail />} /><Route path="/admin/users" element={<AdminUsers />} /><Route path="/admin/notifications" element={<NotificationsPage />} /><Route path="/admin/notifications/preferences" element={<NotificationPreferencesPage />} /><Route path="/admin/profile" element={<ProfilePage />} />
  </Route></Route><Route path="/admin/login" element={<Navigate to="/login" replace />} /><Route path="*" element={<NotFoundPage />} />
</Routes></> }
