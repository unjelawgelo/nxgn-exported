import { useState, useEffect } from 'react'
import { User } from '../App'
import { blink } from '../blink/client'
import { Music, ListMusic, Users, Settings as SettingsIcon, Home, Crown, Shield, User as UserIcon, LogOut, Menu, Calendar } from 'lucide-react'
import SongLibrary from './SongLibrary'
import PlaylistManager from './PlaylistManager'
import MinistryManager from './MinistryManager'
import UserManager from './UserManager'
import ProfileSettings from './ProfileSettings'
import { Availability } from './Availability'
import { DashboardView } from './DashboardView'
import LearnModule from './LearnModule'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ProfileDropdown } from './layout/ProfileDropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { ResponsiveLayout } from './layout/ResponsiveLayout'
import { ResponsiveNav } from './layout/ResponsiveNav'
import { cn } from '../lib/utils'

// Define prop types for child components
interface SongLibraryProps {
  user: User;
  ministryId?: string;
}

interface PlaylistManagerProps {
  user: User;
  ministryId?: string;
}

interface UserManagerProps {
  user: User;
  ministryId?: string;
}

interface ProfileSettingsProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
}

interface MinistryManagerProps {
  user: User;
}

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'songs' | 'playlists' | 'ministries' | 'users' | 'settings' | 'home' | 'availability' | 'learn'>(() => {

    // Load active tab from localStorage, default to 'home'
    try {
      const savedTab = localStorage.getItem('nxgn:activeTab')
      return (savedTab as any) || 'home'
    } catch (e) {
      return 'home'
    }
  })
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

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
        localStorage.setItem('nxgn:lastMinistry', selectedMinistryId);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [selectedMinistryId, user.role]);

  // Handle logout - clear the active tab from localStorage
  const handleLogout = () => {
    try {
      localStorage.removeItem('nxgn:activeTab');
    } catch (e) {
      // ignore storage errors
    }
    onLogout();
  }

  // Persist active tab
  useEffect(() => {
    try {
      localStorage.setItem('nxgn:activeTab', activeTab)
    } catch (e) {
      // ignore storage errors
    }
  }, [activeTab])

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
        return user.role === 'main_admin';
      case 'users':
        // Only admins (main_admin or sub_admin) can access Members tab
        return user.role === 'main_admin' || user.role === 'sub_admin';
      default:
        return true;
    }
  };

  const renderContent = () => {
    const commonProps = { user, ministryId: selectedMinistryId };
    
    switch (activeTab) {
      case 'learn':
        return <LearnModule />
      case 'home':
        return <DashboardView {...commonProps} />
      case 'songs':
        return <SongLibrary {...commonProps} />
      case 'playlists':
        return <PlaylistManager {...commonProps} />
      case 'ministries':
        return (user.role === 'main_admin' || user.role === 'sub_admin') ? 
          <MinistryManager userRole={user.role} /> : null
      case 'users':
        return (user.role === 'main_admin' || user.role === 'sub_admin') 
          ? <UserManager {...commonProps} ministryId={selectedMinistryId} /> 
          : null
      case 'availability':
        return <Availability {...commonProps} />
      case 'settings':
        return (
          <ProfileSettings 
            user={user} 
            onLogout={onLogout} 
            onUserUpdate={onUserUpdate} 
          />
        )
      default:
        return null;
    }
  }

  const renderHeader = () => {
    const currentMinistry = ministries.find(m => m.id === selectedMinistryId) || ministry;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const shouldAddSpacing = isMobile && !isMobileMenuOpen;
    
    return (
      <div className="flex items-center justify-between w-full min-h-[40px]">
        <div className="flex items-center h-full">
          <div className={`flex flex-col justify-center transition-all duration-300 ease-in-out ${shouldAddSpacing ? 'pl-8' : isMobileMenuOpen ? 'pl-1' : ''} h-full`}>
            <h1 
              className="text-xl font-semibold text-foreground relative"
            >
              <span 
                className={`transition-all duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'text-shadow-glow' : ''
                }`}
                style={{
                  transition: isMobileMenuOpen 
                    ? 'text-shadow 300ms ease-in-out' 
                    : 'text-shadow 300ms ease-in-out 300ms' // Add delay to match sidebar close
                }}
              >
                NXGN.
              </span>
            </h1>
            {currentMinistry?.name && (
              <p 
                className="text-xs text-muted-foreground transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] md:max-w-[220px]"
                title={currentMinistry.name}
              >
                {currentMinistry.name}
              </p>
            )}
          </div>
          {isMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-14 py-1 -mr-2 text-muted-foreground hover:text-foreground transition-all duration-200 self-center group relative"
              aria-label="Close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
className={`transition-all duration-300 transform group-hover:scale-110 ${isMobileMenuOpen ? 'animate-bounce-horizontal' : 'opacity-0'}`}
              >
<path d="m9 18 6-6-6-6" className="transform group-hover:translate-x-0.5 transition-transform duration-200" />
              </svg>
            </button>
          )}
        </div>
        <div className={isMobileMenuOpen ? 'hidden' : 'flex items-center gap-4'}>
          {user.role !== 'main_admin' && (
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground text-right">
                {user.name.split(' ').slice(0, 2).join(' ')}
              </span>
              {user.customTag && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full font-medium mt-0.5"
                  style={{ 
                    backgroundColor: `${user.tagColor}1a`, 
                    color: user.tagColor 
                  }}
                >
                  {user.customTag}
                </span>
              )}
            </div>
          )}
          <div className={`${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'} flex items-center`}>
            {user.role === 'main_admin' && (
              <Crown className="h-4 w-4 text-yellow-500 mr-2" />
            )}
            <ProfileDropdown
              user={user}
              ministries={user.role === 'main_admin' ? ministries : []}
              selectedMinistryId={selectedMinistryId}
              onMinistryChange={(id) => setSelectedMinistryId(id)}
              onLogout={onLogout}
              onProfileClick={() => setActiveTab('settings')}
            />
          </div>
        </div>
      </div>
    );
  }

  const renderSidebar = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="h-16 flex-shrink-0"></div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <ResponsiveNav 
            activeTab={activeTab} 
            onTabChange={(tab) => {
              setActiveTab(tab as any);
              if (isMobile) {
                // Close the mobile menu after a short delay for better UX
                setTimeout(() => setIsMobileMenuOpen(false), 150);
              }
            }}
            userRole={user.role}
            onItemClick={() => {
              if (isMobile) {
                setIsMobileMenuOpen(false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayout
      sidebarContent={renderSidebar()}
      headerContent={renderHeader()}
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuToggle={setIsMobileMenuOpen}
    >
      <div className="mx-auto w-full max-w-7xl">
        {renderContent()}
      </div>
    </ResponsiveLayout>
  );
}