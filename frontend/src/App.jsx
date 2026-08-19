import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import PublicLayout from './layouts/PublicLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import OrganizerDashboard from './pages/OrganizerDashboard.jsx'
import SignupPage from './pages/SignupPage.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import EventsPage from './pages/EventsPage.jsx'
import EventDetailsPage from './pages/EventDetailsPage.jsx'
import MyRegistrationsPage from './pages/MyRegistrationsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import StudentDataProvider from './context/StudentDataProvider.jsx'
import OrganizerDataProvider from './context/OrganizerDataProvider.jsx'
import ManageEventsPage from './pages/ManageEventsPage.jsx'
import CreateEventPage from './pages/CreateEventPage.jsx'
import EditEventPage from './pages/EditEventPage.jsx'
import OrganizerEventDetailsPage from './pages/OrganizerEventDetailsPage.jsx'
import AttendeesPage from './pages/AttendeesPage.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<StudentDataProvider><DashboardLayout /></StudentDataProvider>}>
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/events" element={<EventsPage />} />
          <Route path="student/events/:eventId" element={<EventDetailsPage />} />
          <Route path="student/registrations" element={<MyRegistrationsPage />} />
          <Route path="student/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['organizer']} />}>
        <Route element={<OrganizerDataProvider><DashboardLayout /></OrganizerDataProvider>}>
          <Route path="organizer" element={<OrganizerDashboard />} />
          <Route path="organizer/events" element={<ManageEventsPage />} />
          <Route path="organizer/events/new" element={<CreateEventPage />} />
          <Route path="organizer/events/:eventId" element={<OrganizerEventDetailsPage />} />
          <Route path="organizer/events/:eventId/edit" element={<EditEventPage />} />
          <Route path="organizer/events/:eventId/attendees" element={<AttendeesPage />} />
          <Route path="organizer/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="dashboard" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
