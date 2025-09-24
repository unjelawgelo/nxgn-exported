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
}: ResponsiveHeaderProps) {
  return (
    <div className={cn(
      'sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border p-4',
      className
    )}>
      <div className="flex items-center justify-between w-full">
        <h1 className="text-xl font-semibold text-foreground">
          {title}
        </h1>
        
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
