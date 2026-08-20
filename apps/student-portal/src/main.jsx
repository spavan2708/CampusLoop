import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import AuthProvider from '../../../frontend/src/context/AuthProvider.jsx'
import NavigationGuardProvider from '../../../frontend/src/context/NavigationGuardProvider.jsx'
import ToastProvider from '../../../frontend/src/context/ToastProvider.jsx'
import NotificationProvider from '../../../frontend/src/context/NotificationProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <NavigationGuardProvider><App /></NavigationGuardProvider>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
