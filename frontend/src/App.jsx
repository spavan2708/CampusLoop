import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import FullPageLoader from './components/FullPageLoader.jsx'
import PageExperience from './components/PageExperience.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import StudentDataProvider from './context/StudentDataProvider.jsx'
import OrganizerDataProvider from './context/OrganizerDataProvider.jsx'
import './App.css'

const pages = import.meta.glob('./pages/*.jsx')
const load = (name) => lazy(pages[`./pages/${name}.jsx`])
const LandingPage = load('LandingPage'), LoginPage = load('LoginPage'), NotFoundPage = load('NotFoundPage'), OrganizerDashboard = load('OrganizerDashboard'), SignupPage = load('SignupPage'), StudentDashboard = load('StudentDashboard'), EventsPage = load('EventsPage'), EventDetailsPage = load('EventDetailsPage'), MyRegistrationsPage = load('MyRegistrationsPage'), ProfilePage = load('ProfilePage'), UnauthorizedPage = load('UnauthorizedPage'), ManageEventsPage = load('ManageEventsPage'), CreateEventPage = load('CreateEventPage'), EditEventPage = load('EditEventPage'), OrganizerEventDetailsPage = load('OrganizerEventDetailsPage'), AttendeesPage = load('AttendeesPage'), LoginChooserPage = load('LoginChooserPage'), AdminDashboard = load('AdminDashboard'), ClubsPage = load('ClubsPage'), ClubDetailsPage = load('ClubDetailsPage'), SavedEventsPage = load('SavedEventsPage'), CreateClubPage = load('CreateClubPage'), NotificationsPage = load('NotificationsPage'), NotificationPreferencesPage = load('NotificationPreferencesPage')

function App() {
  const location = useLocation()
  return (
    <><PageExperience /><Suspense fallback={<FullPageLoader />}><div className="route-view" key={location.pathname}><Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginChooserPage />} />
        <Route path="student/login" element={<LoginPage role="student" />} />
        <Route path="club/login" element={<LoginPage role="club_admin" />} />
        <Route path="admin/login" element={<LoginPage role="central_admin" />} />
        <Route path="student/signup" element={<SignupPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<StudentDataProvider><DashboardLayout /></StudentDataProvider>}>
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/events" element={<EventsPage />} />
          <Route path="student/events/:eventId" element={<EventDetailsPage />} />
          <Route path="student/registrations" element={<MyRegistrationsPage />} />
          <Route path="student/profile" element={<ProfilePage />} />
          <Route path="student/saved" element={<SavedEventsPage />} />
          <Route path="student/clubs" element={<ClubsPage />} />
          <Route path="student/clubs/:slug" element={<ClubDetailsPage />} />
          <Route path="student/notifications" element={<NotificationsPage />} />
          <Route path="student/notifications/preferences" element={<NotificationPreferencesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["central_admin"]} />}>
        <Route element={<DashboardLayout />}><Route path="admin" element={<AdminDashboard />} /><Route path="admin/clubs/new" element={<CreateClubPage />} /><Route path="admin/profile" element={<ProfilePage />} /><Route path="admin/notifications" element={<NotificationsPage />} /><Route path="admin/notifications/preferences" element={<NotificationPreferencesPage />} /></Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["club_admin"]} />}>
        <Route element={<OrganizerDataProvider><DashboardLayout /></OrganizerDataProvider>}>
          <Route path="club" element={<OrganizerDashboard />} />
          <Route path="club/events" element={<ManageEventsPage />} />
          <Route path="club/events/new" element={<CreateEventPage />} />
          <Route path="club/events/:eventId" element={<OrganizerEventDetailsPage />} />
          <Route path="club/events/:eventId/edit" element={<EditEventPage />} />
          <Route path="club/events/:eventId/attendees" element={<AttendeesPage />} />
          <Route path="club/profile" element={<ProfilePage />} />
          <Route path="club/notifications" element={<NotificationsPage />} />
          <Route path="club/notifications/preferences" element={<NotificationPreferencesPage />} />
        </Route>
      </Route>

      <Route path="dashboard" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></div></Suspense></>
  )
}

export default App
