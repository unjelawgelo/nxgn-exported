import { cn } from '../../lib/utils'

export const CardSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('animate-pulse rounded-md bg-muted', className)}
    {...props}
  />
)

export const ListSkeleton = ({ count = 5, className, itemClassName }: { 
  count?: number; 
  className?: string;
  itemClassName?: string;
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className={cn('p-4 border border-border rounded-lg bg-card', itemClassName)}
      >
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-5/6 mt-2" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>
      </div>
    ))}
  </div>
)

export const PageSkeleton = ({ 
  withHeader = true,
  withSearch = true,
  withFilters = true,
  withContent = true,
  contentSkeleton: ContentSkeleton = ListSkeleton,
  className = ''
}: {
  withHeader?: boolean;
  withSearch?: boolean;
  withFilters?: boolean;
  withContent?: boolean;
  contentSkeleton?: React.ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={cn('h-full flex flex-col p-4', className)}>
    {withHeader && (
      <div className="flex flex-col space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
          <div className="h-9 w-9 bg-muted rounded-full animate-pulse" />
        </div>
        {withSearch && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 bg-muted rounded-lg animate-pulse" />
            {withFilters && (
              <div className="w-[140px] h-10 bg-muted rounded-lg animate-pulse" />
            )}
          </div>
        )}
      </div>
    )}
    {withContent && ContentSkeleton && <ContentSkeleton className="animate-pulse" />}
  </div>
)
