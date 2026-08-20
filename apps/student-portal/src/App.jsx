import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import FullPageLoader from '../../../frontend/src/components/FullPageLoader.jsx'
import PageExperience from '../../../frontend/src/components/PageExperience.jsx'
import ProtectedRoute from '../../../frontend/src/components/ProtectedRoute.jsx'
import StudentDataProvider from '../../../frontend/src/context/StudentDataProvider.jsx'
import useAuth from '../../../frontend/src/context/useAuth.js'
import StudentLayout from './layouts/StudentLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PortalProfilePage from './pages/ProfilePage.jsx'
import PortalRegistrationsPage from './pages/RegistrationsPage.jsx'
import PortalSavedEventsPage from './pages/SavedEventsPage.jsx'
import PortalUnauthorizedPage from './pages/UnauthorizedPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'

const StudentDashboard = lazy(() => import('../../../frontend/src/pages/StudentDashboard.jsx'))
const EventsPage = lazy(() => import('../../../frontend/src/pages/EventsPage.jsx'))
const EventDetailsPage = lazy(() => import('../../../frontend/src/pages/EventDetailsPage.jsx'))
const NotificationsPage = lazy(() => import('../../../frontend/src/pages/NotificationsPage.jsx'))
const NotificationPreferencesPage = lazy(() => import('../../../frontend/src/pages/NotificationPreferencesPage.jsx'))
const NotFoundPage = lazy(() => import('../../../frontend/src/pages/NotFoundPage.jsx'))

function PublicStudentPage({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return children
  return <Navigate to={user.role === 'student' ? '/dashboard' : '/unauthorized'} replace />
}

function studentRoutes() {
  return (
    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
      <Route element={<StudentDataProvider><StudentLayout /></StudentDataProvider>}>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:eventId" element={<EventDetailsPage />} />
        <Route path="registrations" element={<PortalRegistrationsPage />} />
        <Route path="saved" element={<PortalSavedEventsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/preferences" element={<NotificationPreferencesPage />} />
        <Route path="profile" element={<PortalProfilePage />} />

        {/* Existing notification records use these historical paths. */}
        <Route path="student" element={<Navigate to="/dashboard" replace />} />
        <Route path="student/events" element={<EventsPage />} />
        <Route path="student/events/:eventId" element={<EventDetailsPage />} />
        <Route path="student/registrations" element={<Navigate to="/registrations" replace />} />
        <Route path="student/saved" element={<Navigate to="/saved" replace />} />
        <Route path="student/notifications" element={<Navigate to="/notifications" replace />} />
        <Route path="student/notifications/preferences" element={<Navigate to="/notifications/preferences" replace />} />
        <Route path="student/profile" element={<Navigate to="/profile" replace />} />
      </Route>
    </Route>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <PageExperience />
      <Suspense fallback={<FullPageLoader />}>
        <div className="route-view" key={location.pathname}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<PublicStudentPage><LoginPage /></PublicStudentPage>} />
              <Route path="signup" element={<PublicStudentPage><SignupPage /></PublicStudentPage>} />
              <Route path="student/login" element={<PublicStudentPage><LoginPage /></PublicStudentPage>} />
              <Route path="student/signup" element={<PublicStudentPage><SignupPage /></PublicStudentPage>} />
              <Route path="unauthorized" element={<PortalUnauthorizedPage />} />
            </Route>
            {studentRoutes()}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Suspense>
    </>
  )
}
