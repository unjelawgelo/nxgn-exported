
import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { LogIn, UserPlus, Home, Eye, EyeOff } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import MinistryPasscodeInput from './MinistryPasscodeInput'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface AuthScreenProps {
  onLogin: (user: User) => void
}

interface Ministry {
  id: string
  name: string
  passcode: string
  adminId: string
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'join'>('login')
  const [pincode, setPincode] = useState('')
  const [showPincode, setShowPincode] = useState(false)
  const [showCreatePincode, setShowCreatePincode] = useState(false)
  const [showMinistryPasscodeInput, setShowMinistryPasscodeInput] = useState(false)
  const [name, setName] = useState('')
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [ministryPasscode, setMinistryPasscode] = useState('')
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [ministriesLoading, setMinistriesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const notifications = useNotifications()

  // Splash intro state: show big NXGN. logo briefly on first load
  const [showSplash, setShowSplash] = useState(true)

  const MAIN_ADMIN_PINCODE = 'AdminAdminJrev007'

  const loadMinistries = useCallback(async () => {
    try {
      setMinistriesLoading(true)
      const ministryList = await blink.db.ministries.list()
      setMinistries(ministryList as Ministry[])
    } catch (err) {
      console.error('Failed to load ministries:', err)
      notifications.showError('Failed to load ministries', 'Please try again.')
    } finally {
      setMinistriesLoading(false)
    }
  }, [notifications])

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (mode === 'join') {
      loadMinistries()
    }
  }, [mode, loadMinistries])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pincode) return

    setLoading(true)

    try {
      // Special-case: Main Admin pincode grants global admin access
      if (pincode === MAIN_ADMIN_PINCODE) {
        // Try to find an existing main admin with this pincode
        const admins = await blink.db.users.list({ where: { pincode } })
        let adminUser = admins[0]

        if (!adminUser) {
          // Create a seeded Main Admin account
          const id = 'main-admin'
          const created = await blink.db.users.create({
            id,
            name: 'Main Administrator',
            pincode,
            role: 'main_admin',
            status: 'approved'
          })
          adminUser = created
        } else {
          // Ensure user has main_admin role and approved status
          if (adminUser.role !== 'main_admin' || adminUser.status !== 'approved') {
            try {
              await blink.db.users.update(adminUser.id, { role: 'main_admin', status: 'approved' })
              adminUser.role = 'main_admin'
              adminUser.status = 'approved'
            } catch (err) {
              console.warn('Failed to elevate existing user to main admin:', err)
            }
          }
        }

        onLogin(adminUser as User)
        return
      }

      const users = await blink.db.users.list({
        where: { pincode: pincode }
      })

      if (users.length === 0) {
        notifications.showError('Invalid passcode', 'Please try again.')
        return
      }

      const user = users[0] as User

      if (user.status === 'pending') {
        notifications.showError('Account pending', 'Please wait for admin approval.')
        return
      }

      if (user.status === 'rejected') {
        notifications.showError('Account rejected', 'Please contact an administrator.')
        return
      }

      onLogin(user)
    } catch (err) {
      console.error('Login failed:', err)
      notifications.showError('Login failed', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinMinistry = async (ministry: Ministry) => {
    setSelectedMinistry(ministry)
    setMinistryPasscode('')
    setPincode('')
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !pincode || !selectedMinistry || !ministryPasscode) return

    if (ministryPasscode !== selectedMinistry.passcode) {
      notifications.showError('Invalid ministry passcode', 'Please check with your ministry administrator.')
      return
    }

    setLoading(true)

    try {
      // Check if pincode already exists
      const existingUsers = await blink.db.users.list({
        where: { pincode: pincode }
      })

      if (existingUsers.length > 0) {
        notifications.showError('Passcode taken', 'Please choose a different passcode.')
        return
      }

      const userId = `user-${Date.now()}`
      const newUser = {
        id: userId,
        name: name,
        pincode: pincode,
        role: 'user',
        ministryId: selectedMinistry.id,
        status: 'pending'
      }

      await blink.db.users.create(newUser)

      // Note: Join request is handled via user status - no separate joinRequests table needed

      notifications.showSuccess('Account created', 'Please wait for ministry admin approval.')
      setMode('login')
      setSelectedMinistry(null)
      setName('')
      setPincode('')
    } catch (err) {
      console.error('Account creation failed:', err)
      notifications.showError('Account creation failed', 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // If we're still showing the splash, render it first and exit early
  if (showSplash) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4">
        <div className="text-center w-full">
          <span className="sr-only">NXGN.</span>
          <h1 className="nxgn-splash font-extrabold nxgn-logo steady-letters animate-glow-then-fade" aria-hidden="true">
            <span className="letter">N</span>
            <span className="letter">X</span>
            <span className="letter">G</span>
            <span className="letter">N</span>
            <span className="letter">.</span>
          </h1>
          <p className="nxgn-splash-subtitle mt-4 text-center" aria-hidden="true">MADE FOR THE NEXT GENERATION</p>
        </div>
      </div>
    )
  }

  if (mode === 'join' && !selectedMinistry) {

    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4 animate-auth-entry">
        <div className="fixed top-4 right-4 z-50">
          <Button variant="ghost" onClick={() => { window.open('/nxgn-export.zip', '_blank') }} className="px-3 py-2 text-sm">Download Code</Button>
        </div>
        <div className="w-full max-w-md fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold nxgn-logo glow mb-2 flex items-baseline justify-center gap-2">
            <span className="leading-none">NXGN<span className="nxgn-logo">.</span></span>
          </h1>
            <p className="text-white text-sm">Choose your church or ministry to join</p>
          </div>

          <div className="space-y-3 mb-6">
            {ministriesLoading ? (
              <div className="flex items-center justify-center p-6">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin border-primary" />
              </div>
            ) : (
              ministries.map((ministry) => (
                <button
                  key={ministry.id}
                  onClick={() => handleJoinMinistry(ministry)}
                  className="w-full p-4 bg-background border border-border rounded-lg hover:bg-background/90 transition-colors text-left flex items-center gap-3"
                >
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-foreground font-medium">{ministry.name}</span>
                </button>
              ))
            )}
          </div>

          <Button onClick={() => setMode('login')} className="w-full p-3 bg-card border border-border rounded-lg text-sm text-[#3B82F6] transition-colors flex items-center justify-center no-hover">
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'join' && selectedMinistry) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center p-4 animate-auth-entry">
        <div className="fixed top-4 right-4 z-50">
          <Button variant="ghost" onClick={() => { window.open('/nxgn-export.zip', '_blank') }} className="px-3 py-2 text-sm">Download Code</Button>
        </div>
        <div className="w-full max-w-md fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold nxgn-logo glow mb-2 flex items-baseline justify-center gap-2">
            <span className="leading-none">NXGN<span className="nxgn-logo">.</span></span>
          </h1>
            <h2 className="text-xl text-foreground mb-2">Join {selectedMinistry.name}</h2>
            <p className="text-white text-sm">Create your account to join this ministry</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-4"
                required
              />
            </div>

            <div className="relative">
              <Input
                type={showCreatePincode ? 'text' : 'password'}
                placeholder="Passcode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="pr-12 p-4"
                required
              />
              {pincode && pincode.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreatePincode(s => !s)}
                  aria-pressed={showCreatePincode}
                  aria-label={showCreatePincode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-3 inset-y-0 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showCreatePincode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              )}
            </div>

            <div>
              <MinistryPasscodeInput
                value={ministryPasscode}
                onChange={(e) => setMinistryPasscode(e.target.value)}
                placeholder="Ministry Passcode"
                required
              />

              <p className="text-xs text-muted-foreground mt-2">Ask your ministry administrator for this passcode</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center font-medium preserve-hover"
              aria-busy={loading}
            >
              {loading ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3" /> : null}
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </form>

          <div className="flex justify-between mt-6 text-sm">
            <Button variant="link" onClick={() => setSelectedMinistry(null)}>
              Choose Ministry
            </Button>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">Have an account? </span>
              <Button variant="ghost" onClick={() => setMode('login')} className="preserve-hover">
                Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center p-4 animate-auth-entry">
      <div className="fixed top-4 right-4 z-50">
        <Button variant="ghost" onClick={() => { window.open('/nxgn-export.zip', '_blank') }} className="px-3 py-2 text-sm">Download Code</Button>
      </div>
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold nxgn-logo glow mb-2 flex items-baseline justify-center gap-2">
            <span className="leading-none">NXGN<span className="nxgn-logo">.</span></span>
          </h1>
          <p className="text-white text-sm">Enter your passcode to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Input
              type={showPincode ? 'text' : 'password'}
              placeholder="Enter Your Passcode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="pr-12 p-5"
              required
            />
            {pincode && pincode.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPincode(s => !s)}
                aria-pressed={showPincode}
                className="absolute right-3 inset-y-0 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPincode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full p-5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center font-medium preserve-hover" aria-busy={loading}>
            {loading ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" /> : null}
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => setMode('join')} className="text-sm no-hover">
            <span className="text-white mr-1">Don't have an account?</span>
            <span className="text-[#3B82F6]">Join a Ministry</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

