import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, User as UserIcon, Settings as SettingsIcon, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useConfirm } from '../../hooks/useConfirm';

interface Ministry {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  profilePhoto?: string;
  customTag?: string;
  tagColor?: string;
  ministryId?: string;
}

interface ProfileDropdownProps {
  user: User;
  ministries?: Ministry[];
  selectedMinistryId?: string;
  onMinistryChange?: (id: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  className?: string;
}

export function ProfileDropdown({
  user,
  ministries = [],
  selectedMinistryId,
  onMinistryChange,
  onLogout,
  onProfileClick,
  className = '',
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinistryDropdownOpen, setIsMinistryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMinistryDropdownOpen(false);
      }
    }

    // Close ministry dropdown when main dropdown closes
    if (!isOpen) {
      setIsMinistryDropdownOpen(false);
    }

    // Only add the event listener when the dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="ghost"
        className="p-0 h-auto rounded-full hover:bg-accent/50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.profilePhoto} alt={user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-card shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profilePhoto} alt={user.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <div className="relative mt-1">
                  <span
                    className="inline-flex items-center justify-center text-xs font-semibold px-2 py-1 rounded-full
                      bg-black text-white border border-white
                      shadow-[0_0_2.7px] hover:shadow-[0_0_6px] hover:scale-105 transform
                      transition-all duration-200 ease-in-out whitespace-nowrap"
                    style={{
                      animation: 'borderNeon 3s linear infinite',
                      textShadow: '0 0 2px rgb(163, 9, 9) 0, 0)'
                    }}
                  >
                    {user.role === 'main_admin' 
                      ? 'Mike Angelo | NXGN.' 
                      : user.role === 'sub_admin' 
                        ? 'Ministry Admin | NXGN.' 
                        : 'NXGN | User'}
                  </span>
                  <style>
                    {`
                      @keyframes borderNeon {
                        0% { border-color: rgb(24, 255, 255); }
                        25% { border-color: rgb(73, 211, 144); }
                        50% { border-color: rgb(255, 252, 103); }
                        75% { border-color: rgb(191, 255, 0); }
                        100% { border-color: rgb(0, 247, 255); }
                      }
                    `}
                  </style>
                </div>
              </div>
            </div>
          </div>

          {ministries.length > 0 && onMinistryChange && selectedMinistryId && (
            <div className="p-3 border-b">
              <label className="block text-xs font-medium text-muted-foreground mb-1 px-1">
                Switch Ministry
              </label>
              <div className="relative">
                <div 
                  className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinistryDropdownOpen(!isMinistryDropdownOpen);
                  }}
                >
                  <span>{ministries.find(m => m.id === selectedMinistryId)?.name || 'Select ministry'}</span>
                  <ChevronDown 
                    className={`h-4 w-4 opacity-50 transition-transform ${isMinistryDropdownOpen ? 'rotate-180' : ''}`} 
                  />
                </div>
                {isMinistryDropdownOpen && (
                  <div 
                    className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                  {ministries.map((ministry) => (
                    <div
                      key={ministry.id}
                      className="relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        onMinistryChange(ministry.id);
                        setIsMinistryDropdownOpen(false); // Only close the ministry dropdown, not the profile dropdown
                      }}
                    >
                      <span>{ministry.name}</span>
                      {selectedMinistryId === ministry.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal"
              onClick={() => {
                onProfileClick();
                setIsOpen(false);
              }}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profile Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal"
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Sign Out',
                  message: 'Are you sure you want to sign out?',
                  confirmText: 'Sign Out',
                  cancelText: 'Cancel',
                  variant: 'destructive'
                });
                if (confirmed) {
                  onLogout();
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
