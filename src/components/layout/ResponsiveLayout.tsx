import { ReactNode, useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ResponsiveLayoutProps {
  children: ReactNode;
  sidebarContent: ReactNode;
  headerContent: ReactNode;
  className?: string;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: (isOpen: boolean) => void;
}

export function ResponsiveLayout({ 
  children, 
  sidebarContent, 
  headerContent, 
  className = '',
  isMobileMenuOpen: externalIsMobileMenuOpen = false,
  onMobileMenuToggle
}: ResponsiveLayoutProps) {
  const [internalIsMobileMenuOpen, setInternalIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Use external state if provided, otherwise use internal state
  const isMobileMenuOpen = onMobileMenuToggle ? externalIsMobileMenuOpen : internalIsMobileMenuOpen;
  const setIsMobileMenuOpen = onMobileMenuToggle ? onMobileMenuToggle : setInternalIsMobileMenuOpen;

  // Close sidebar when clicking outside and prevent body scroll when sidebar is open
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isMobileMenuOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    // Prevent body scroll when sidebar is open on mobile
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent touch events on the main content when sidebar is open
      document.body.style.pointerEvents = 'none';
      if (sidebarRef.current) {
        sidebarRef.current.style.pointerEvents = 'auto';
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
  }, [isMobileMenuOpen, isMobile]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Animated hamburger button with delay when showing up */}
      <div className={`fixed top-3 left-2 z-50 transition-all duration-300 ease-in-out ${
        isMobileMenuOpen 
          ? 'opacity-0 -translate-x-2 pointer-events-none' 
          : 'opacity-0 [animation:fadeIn_0.3s_ease-out_0.3s_forwards]'
      }`}>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateX(-4px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `
        }} />
        <button
          onClick={() => {
            setIsMobileMenuOpen(true);
            // Add a class to trigger the fade out animation
            const button = document.querySelector('[aria-label="Open menu"]');
            if (button) {
              button.classList.add('opacity-0');
              setTimeout(() => button.classList.remove('opacity-0'), 300);
            }
          }}
          className="group p-2 text-white hover:text-white/90 transition-all duration-200 ease-out focus:outline-none"
          aria-label="Open menu"
        >
          <div className="relative w-5 h-5">
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-current rounded-full transform -translate-x-1/2 -translate-y-1.5 transition-all duration-300 group-hover:w-5"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-current rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group-hover:w-5"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-current rounded-full transform -translate-x-1/2 translate-y-1 transition-all duration-300 group-hover:w-5"></div>
          </div>
        </button>
      </div>

{/* Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out bg-card',
          isMobile ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
          'md:relative md:translate-x-0'
        )}
      >
        <div className="h-full overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="h-16 flex items-center px-4">
            <div className="flex-1 h-full flex items-center">
              {headerContent}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
