import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import FullPageLoader from '../../../frontend/src/components/FullPageLoader.jsx'
import PageExperience from '../../../frontend/src/components/PageExperience.jsx'
import ProtectedRoute from '../../../frontend/src/components/ProtectedRoute.jsx'
import OrganizerDataProvider from '../../../frontend/src/context/OrganizerDataProvider.jsx'
import useAuth from '../../../frontend/src/context/useAuth.js'
import DashboardLayout from '../../../frontend/src/layouts/DashboardLayout.jsx'
import ApplicationPage from './pages/ApplicationPage.jsx'
import ClubEventDetailsPage from './pages/ClubEventDetailsPage.jsx'
import EventPreviewPage from './pages/EventPreviewPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

const LoginPage = lazy(() => import('../../../frontend/src/pages/LoginPage.jsx'))
const OrganizerDashboard = lazy(() => import('../../../frontend/src/pages/OrganizerDashboard.jsx'))
const ManageEventsPage = lazy(() => import('../../../frontend/src/pages/ManageEventsPage.jsx'))
const CreateEventPage = lazy(() => import('../../../frontend/src/pages/CreateEventPage.jsx'))
const EditEventPage = lazy(() => import('../../../frontend/src/pages/EditEventPage.jsx'))
const AttendeesPage = lazy(() => import('./pages/ClubAttendeesPage.jsx'))
const ProfilePage = lazy(() => import('../../../frontend/src/pages/ProfilePage.jsx'))
const NotificationsPage = lazy(() => import('../../../frontend/src/pages/NotificationsPage.jsx'))
const NotificationPreferencesPage = lazy(() => import('../../../frontend/src/pages/NotificationPreferencesPage.jsx'))
const UnauthorizedPage = lazy(() => import('../../../frontend/src/pages/UnauthorizedPage.jsx'))
const NotFoundPage = lazy(() => import('../../../frontend/src/pages/NotFoundPage.jsx'))

function PublicClubPage({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return children
  return <Navigate to={user.role === 'club_admin' ? '/club' : '/unauthorized'} replace />
}

export default function App() {
  const location = useLocation()
  return <><PageExperience /><Suspense fallback={<FullPageLoader />}>
    <div className="route-view" key={location.pathname}><Routes>
      <Route index element={<PublicClubPage><LandingPage /></PublicClubPage>} />
      <Route path="login" element={<PublicClubPage><LoginPage role="club_admin" /></PublicClubPage>} />
      <Route path="apply" element={<PublicClubPage><ApplicationPage /></PublicClubPage>} />
      <Route path="club/login" element={<Navigate to="/login" replace />} />
      <Route path="club/apply" element={<Navigate to="/apply" replace />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />
      <Route element={<ProtectedRoute allowedRoles={['club_admin']} />}>
        <Route element={<OrganizerDataProvider><DashboardLayout /></OrganizerDataProvider>}>
          <Route path="club" element={<OrganizerDashboard />} />
          <Route path="club/events" element={<ManageEventsPage />} />
          <Route path="club/events/new" element={<CreateEventPage />} />
          <Route path="club/events/:eventId" element={<ClubEventDetailsPage />} />
          <Route path="club/events/:eventId/edit" element={<EditEventPage />} />
          <Route path="club/events/:eventId/preview" element={<EventPreviewPage />} />
          <Route path="club/events/:eventId/attendees" element={<AttendeesPage />} />
          <Route path="club/profile" element={<ProfilePage />} />
          <Route path="club/notifications" element={<NotificationsPage />} />
          <Route path="club/notifications/preferences" element={<NotificationPreferencesPage />} />
        </Route>
      </Route>
      <Route path="dashboard" element={<Navigate to="/club" replace />} />
      <Route path="events" element={<Navigate to="/club/events" replace />} />
      <Route path="events/new" element={<Navigate to="/club/events/new" replace />} />
      <Route path="events/:eventId" element={<NavigateToClubEvent />} />
      <Route path="profile" element={<Navigate to="/club/profile" replace />} />
      <Route path="notifications" element={<Navigate to="/club/notifications" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></div>
  </Suspense></>
}

function NavigateToClubEvent() {
  const location = useLocation()
  return <Navigate to={`/club${location.pathname}`} replace />
}
