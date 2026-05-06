import { useState, useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import Dashboard from './components/Dashboard'
import './App.css'
import './styles/selection.css'
import { NotificationProvider } from './hooks/NotificationProvider'
import { ConfirmProvider } from './hooks/ConfirmProvider'

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
  )
}

export default App