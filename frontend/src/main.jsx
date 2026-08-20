import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import NavigationGuardProvider from './context/NavigationGuardProvider.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import NotificationProvider from './context/NotificationProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider><ToastProvider>
          <NavigationGuardProvider><App /></NavigationGuardProvider>
        </ToastProvider></NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
