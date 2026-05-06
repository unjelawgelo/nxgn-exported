import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Home, Music, ListMusic, Users, Settings, Calendar } from 'lucide-react';

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: Home, value: 'home' },
  { name: 'Songs', icon: Music, value: 'songs' },
  { name: 'Line-ups', icon: ListMusic, value: 'playlists' },
  { name: 'Ministries', icon: Users, value: 'ministries', adminOnly: true },
  { name: 'Users', icon: Users, value: 'users', adminOnly: true },
  { name: 'Settings', icon: Settings, value: 'settings' },
];

interface ResponsiveNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
  className?: string;
  onItemClick?: () => void; // Callback when a nav item is clicked
}

export function ResponsiveNav({ activeTab, onTabChange, userRole, className, onItemClick }: ResponsiveNavProps) {
  const isAdmin = ['main_admin', 'sub_admin'].includes(userRole);

  return (
    <nav className={cn('flex flex-col', className)}>
      <div className="p-4 space-y-1">
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => (
          <button
            key={item.value}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(item.value);
              if (onItemClick) {
                // Close the mobile menu with a slight delay for better UX
                setTimeout(() => onItemClick(), 100);
              }
            }}
            className={cn(
              'flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left',
              'text-sm font-medium',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card',
              activeTab === item.value
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-accent-foreground',
            )}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
