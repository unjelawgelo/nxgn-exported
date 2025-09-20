import { useState, useEffect } from 'react'
import { User } from '../App'
import { blink } from '../blink/client'
import { Music, ListMusic, Users, Settings, Home, Crown, Shield, User as UserIcon } from 'lucide-react'
import SongLibrary from './SongLibrary'
import PlaylistManager from './PlaylistManager'
import MinistryManager from './MinistryManager'
import UserManager from './UserManager'
import ProfileSettings from './ProfileSettings'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface DashboardProps {
  user: User
  onLogout: () => void
  onUserUpdate?: (u: User) => void
}

interface Ministry {
  id: string
  name: string
}

export default function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'ministries' | 'users' | 'settings'>('songs')
  const [ministry, setMinistry] = useState<Ministry | null>(null)
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | undefined>(() => {
    try {
      const saved = localStorage.getItem('nxgn:lastMinistry')
      return (saved as string) || user.ministryId
    } catch (e) {
      return user.ministryId
    }
  })
  const [ministries, setMinistries] = useState<Ministry[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user.role === 'main_admin') {
          // Load all ministries for Main Admin
          const allMinistries = await blink.db.ministries.list({
            orderBy: { name: 'asc' }
          })
          setMinistries(allMinistries as Ministry[])
          
          // Set default ministry
          if (!selectedMinistryId && allMinistries.length > 0) {
            setSelectedMinistryId((allMinistries[0] as Ministry).id)
          }
        } else if (user.ministryId) {
          // Load specific ministry for Sub-Admin/Member
          const userMinistry = await blink.db.ministries.list({
            where: { id: user.ministryId }
          })
          if (userMinistry.length > 0) {
            setMinistry(userMinistry[0] as Ministry)
            setSelectedMinistryId(user.ministryId)
          }
        }
      } catch (err) {
        console.error('Failed to load ministry data:', err)
      }
    }
    
    loadData()
    }, [user.ministryId, user.role, selectedMinistryId])
    
    // Persist selected ministry for Main Admin (store preference)
    useEffect(() => {
    try {
      if (user.role === 'main_admin' && selectedMinistryId) {
        localStorage.setItem('nxgn:lastMinistry', selectedMinistryId)
      }
    } catch (e) {
      // ignore storage errors
    }
    }, [selectedMinistryId, user.role])
    
    // Logo glow on reload for 3 seconds
  const [logoGlow, setLogoGlow] = useState<boolean>(true)
  useEffect(() => {
    setLogoGlow(true)
    const t = setTimeout(() => setLogoGlow(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const getRoleIcon = () => {
    switch (user.role) {
      case 'main_admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'sub_admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleLabel = () => {
    switch (user.role) {
      case 'main_admin':
        return 'Main Admin'
      case 'sub_admin':
        return 'Ministry Admin'
      default:
        return 'Member'
    }
  }

  const canAccessTab = (tab: string) => {
    switch (tab) {
      case 'ministries':
        return user.role === 'main_admin'
      case 'users':
        // Only admins (main_admin or sub_admin) can access Members tab
        return user.role === 'main_admin' || user.role === 'sub_admin'
      default:
        return true
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'songs':
        return <SongLibrary user={user} ministryId={selectedMinistryId} />
      case 'playlists':
        return <PlaylistManager user={user} ministryId={selectedMinistryId} />
      case 'ministries':
        return user.role === 'main_admin' ? <MinistryManager /> : null
      case 'users':
        return (user.role === 'main_admin' || user.role === 'sub_admin') ? <UserManager user={user} ministryId={selectedMinistryId} /> : null

      case 'settings':
        return <ProfileSettings user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex flex-col">
            <h1 className="text-2xl font-bold flex items-baseline gap-2">
              <span className={`nxgn-logo ${logoGlow ? 'glow' : ''} leading-none`}>NXGN<span className="nxgn-logo">.</span></span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-[#06B6D4] bg-white/5 beta-tag">BETA</span>
            </h1>
            {user.role === 'main_admin' && ministries.length > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                <Select value={selectedMinistryId || ''} onValueChange={setSelectedMinistryId}>
                  <SelectTrigger className="w-[200px] h-6 text-sm bg-transparent border-0 text-muted-foreground focus:ring-0 focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ministries.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : ministry ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate">{ministry.name}</p>
              </div>
            ) : null}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <div className="flex items-center gap-1 justify-end">
                {getRoleIcon()}
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setActiveTab('settings')}
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium p-0 hover:bg-primary/90"
            >
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border px-4">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="flex gap-1 min-w-max">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 rounded-none h-auto focus:outline-none focus:ring-0 focus:bg-transparent active:bg-transparent hover:bg-transparent ${
              activeTab === 'songs' 
                ? 'border-primary text-primary bg-transparent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={{ backgroundColor: 'transparent !important' }}
          >
            <Music className={`h-4 w-4 ${activeTab === 'songs' ? 'text-primary' : 'text-muted-foreground'}`} />
            Songs
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 rounded-none h-auto focus:outline-none focus:ring-0 focus:bg-transparent active:bg-transparent hover:bg-transparent ${
              activeTab === 'playlists' 
                ? 'border-primary text-primary bg-transparent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={{ backgroundColor: 'transparent !important' }}
          >
            <ListMusic className={`h-4 w-4 ${activeTab === 'playlists' ? 'text-primary' : 'text-muted-foreground'}`} />
            Setlists
          </Button>

          {canAccessTab('ministries') && (
            <Button
              variant="ghost"
              onClick={() => setActiveTab('ministries')}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 rounded-none h-auto focus:outline-none focus:ring-0 focus:bg-transparent active:bg-transparent hover:bg-transparent ${
                activeTab === 'ministries' 
                  ? 'border-primary text-primary bg-transparent' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ backgroundColor: 'transparent !important' }}
            >
              <Home className={`h-4 w-4 ${activeTab === 'ministries' ? 'text-primary' : 'text-muted-foreground'}`} />
              Ministries
            </Button>
          )}

          {canAccessTab('users') && (
            <Button
              variant="ghost"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 rounded-none h-auto focus:outline-none focus:ring-0 focus:bg-transparent active:bg-transparent hover:bg-transparent ${
                activeTab === 'users' 
                  ? 'border-primary text-primary bg-transparent' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ backgroundColor: 'transparent !important' }}
            >
              <Users className={`h-4 w-4 ${activeTab === 'users' ? 'text-primary' : 'text-muted-foreground'}`} />
              Members
            </Button>
          )}



          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 rounded-none h-auto focus:outline-none focus:ring-0 focus:bg-transparent active:bg-transparent hover:bg-transparent ${
              activeTab === 'settings' 
                ? 'border-primary text-primary bg-transparent' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            style={{ backgroundColor: 'transparent !important' }}
          >
            <Settings className={`h-4 w-4 ${activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'}`} />
            Settings
          </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}