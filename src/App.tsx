import React, { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import './App.css'
import './styles/selection.css'
import { NotificationProvider } from './hooks/NotificationProvider'
import { ConfirmProvider } from './hooks/ConfirmProvider'

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#e2e8f0',
          textAlign: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 2rem',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
          }}>
            NXGN
          </div>
          
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 }}>
            Something went wrong
          </h1>
          
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
            The app encountered an error. This might be due to network issues.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            Reload App
          </button>
          
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Check your connection and try again
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface User {
  id: string
  name: string
  email: string
  pincode: string
  role: string
  profilePhoto?: string
  customTag?: string
  tagColor?: string
  ministryId?: string
  status: string
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<'auth' | 'dashboard'>('auth')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('nxgn_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setCurrentScreen('dashboard')
    }
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    localStorage.setItem('nxgn_user', JSON.stringify(userData))
    setCurrentScreen('dashboard')
  }

  // Update user in local state and persist without reloading the app
  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser)
    localStorage.setItem('nxgn_user', JSON.stringify(updatedUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('nxgn_user')
    setCurrentScreen('auth')
  }




  return (
    <ErrorBoundary>
      <NotificationProvider>
        <ConfirmProvider>
          <div className="relative min-h-screen">

            
            {/* Main content: either dashboard (when logged in) or auth screen */}
            {currentScreen === 'dashboard' && user ? (
              <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            ) : currentScreen === 'auth' && (
              <div className="transition-opacity duration-700 opacity-100">
                <AuthScreen onLogin={handleLogin} />
              </div>
            )}
          </div>
        </ConfirmProvider>
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App