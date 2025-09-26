import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Ministry {
  id: string;
  name: string;
}

interface ResponsiveHeaderProps {
  title: string;
  isMobile: boolean;
  ministries?: Ministry[];
  selectedMinistryId?: string;
  onMinistryChange?: (id: string) => void;
  showMinistrySelector?: boolean;
  className?: string;
  children?: React.ReactNode;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: (isOpen: boolean) => void;
}

export function ResponsiveHeader({
  title,
  isMobile,
  ministries = [],
  selectedMinistryId,
  onMinistryChange,
  showMinistrySelector = false,
  className = '',
  children,
  isMobileMenuOpen = false,
  onMobileMenuToggle,
}: ResponsiveHeaderProps) {
  // Get the current ministry name
  const currentMinistry = selectedMinistryId && ministries.length > 0 
    ? ministries.find(m => m.id === selectedMinistryId)?.name || title
    : title;

  return (
    <div className={cn(
      'sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border p-4 w-full',
      className
    )}>
      <div className="flex items-center justify-between w-full relative">
        <div className="flex items-center space-x-4">
          <button 
            className="md:hidden p-2 -ml-2 rounded-md text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => onMobileMenuToggle?.(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                'h-5 w-5 transform transition-transform duration-200',
                isMobileMenuOpen ? 'rotate-90' : ''
              )}
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans">
              NXGN
            </h1>
            {showMinistrySelector && selectedMinistryId && (
              <div className="relative">
                <select
                  value={selectedMinistryId}
                  onChange={(e) => onMinistryChange?.(e.target.value)}
                  className="appearance-none bg-transparent border-none text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:ring-0 pr-6 cursor-pointer"
                >
                  {ministries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                    <path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.2663 6.09731 10.3808 6.04999 10.5 6.04999C10.6192 6.04999 10.7337 6.09731 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73369 9.9027 7.61919 9.95001 7.49999 9.95001C7.38079 9.95001 7.26629 9.9027 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {showMinistrySelector && selectedMinistryId && (
            <div className={cn('w-full', isMobile ? 'max-w-[160px]' : 'w-48')}>
              <Select
                value={selectedMinistryId}
                onValueChange={onMinistryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent>
                  {ministries.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
}
