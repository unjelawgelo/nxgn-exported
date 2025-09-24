import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [showMinistryDropdown, setShowMinistryDropdown] = useState(false);
  const [selectedMinistryName, setSelectedMinistryName] = useState(
    () => ministries.find(m => m.id === selectedMinistryId)?.name || 'Select Ministry'
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ministryDropdownRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  
  const handleMinistryChange = (e: React.ChangeEvent<HTMLSelectElement> | { target: { value: string } }) => {
    const ministryId = e.target.value;
    const selected = ministries.find(m => m.id === ministryId);
    if (selected) {
      setSelectedMinistryName(selected.name);
      onMinistryChange?.(ministryId);
    }
  };
  
  // Update selected ministry name when ministries or selectedMinistryId changes
  useEffect(() => {
    const selected = ministries.find(m => m.id === selectedMinistryId);
    if (selected) {
      setSelectedMinistryName(selected.name);
    }
  }, [ministries, selectedMinistryId]);

  // Handle click outside and prevent body scroll when dropdown is open
  useEffect(() => {
    // Set the header height CSS variable
    const header = document.querySelector('header');
    if (header) {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }

    function handleClickOutside(event: MouseEvent) {
      // Check if click is outside profile dropdown
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
      // Check if click is outside ministry dropdown
      if (showMinistryDropdown && ministryDropdownRef.current && !ministryDropdownRef.current.contains(event.target as Node)) {
        setShowMinistryDropdown(false);
      }
    }

    // Only add the event listener when either dropdown is open
    if (isOpen || showMinistryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        document.body.style.pointerEvents = 'none';
        if (dropdownRef.current) {
          dropdownRef.current.style.pointerEvents = 'auto';
        }
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [isOpen, showMinistryDropdown]);

  const closeDropdown = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          style={{
            top: 'var(--header-height, 64px)',
            height: 'calc(100vh - var(--header-height, 64px))'
          }}
          onClick={closeDropdown} 
        />
      )}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.pointerEvents = 'none';
            if (dropdownRef.current) {
              dropdownRef.current.style.pointerEvents = 'auto';
            }
          } else {
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
          }
        }}
        className="flex items-center space-x-2 focus:outline-none relative z-50"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.profilePhoto} alt={user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div
          className={cn(
            'fixed right-4 mt-2 w-60 rounded-md z-50 bg-card text-card-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
            isOpen ? 'block' : 'hidden',
            className
          )}
          style={{ top: 'calc(100% + 0.5rem)' }}
        >
          <div className="p-4">
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
            <div className="p-3 border-b border-border">
              <label className="block text-xs font-medium text-muted-foreground mb-2 px-1">
                Switch Ministry
              </label>
              <div className="relative" ref={ministryDropdownRef}>
                <div 
                  className="relative w-full flex items-center justify-between rounded-lg border border-input bg-background/80 pl-3 pr-8 py-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMinistryDropdown(!showMinistryDropdown);
                  }}
                >
                  <span className="truncate">{selectedMinistryName}</span>
                  <ChevronDown 
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showMinistryDropdown ? 'rotate-180' : ''}`}
                  />
                </div>
                
                {showMinistryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-lg border shadow-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {ministries.map((ministry) => (
                        <div
                          key={ministry.id}
                          className="relative flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent/50"
                          onMouseDown={(e) => {
                            // Use onMouseDown to prevent the click from triggering the outside click handler
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMinistryChange({ target: { value: ministry.id } } as any);
                            setShowMinistryDropdown(false);
                          }}
                        >
                          <span className="flex-1">{ministry.name}</span>
                          {selectedMinistryId === ministry.id && (
                            <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-1">
            <div className="border-t border-border my-1"></div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal hover:bg-transparent active:bg-black active:text-white-600"
              onClick={() => {
                onProfileClick();
                closeDropdown();
              }}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profile Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal text-red-600 hover:bg-transparent hover:text-red-600 active:bg-black active:text-red dark:text-red-400 dark:hover:bg-transparent dark:hover:text-red-400"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close the dropdown first
                closeDropdown();
                
                // Show confirmation dialog
                const confirmed = await confirm({
                  title: 'Sign Out',
                  message: 'Are you sure you want to sign out?',
                  confirmText: 'Sign Out',
                  cancelText: 'Cancel',
                  variant: 'destructive'
                });
                
                if (confirmed) {
                  onLogout();
                } else {
                  // If cancelled, the dropdown will remain closed but we've already cleaned up
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
