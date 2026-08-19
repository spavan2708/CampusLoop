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
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
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
        <Route element={<DashboardLayout />}>
          <Route path="student" element={<StudentDashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['organizer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="organizer" element={<OrganizerDashboard />} />
        </Route>
      </Route>

      <Route path="dashboard" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
