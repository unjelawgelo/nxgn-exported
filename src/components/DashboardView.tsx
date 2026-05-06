import { useState, useEffect } from 'react';
import { User } from '../App';
import { blink } from '../blink/client';
import { Church, Users, Music, ListMusic } from 'lucide-react';
import { StatsCard } from './ui/StatsCard';
import { DashboardSkeleton } from './ui/dashboard-skeleton';
import { AdminDashboard } from './AdminDashboard';
import { useOfflineStatus } from '../utils/offlineDetector';
import { offlineCache } from '../utils/offlineCache';
import { OfflineIndicator } from './ui/offline-indicator';

interface DashboardStats {
  totalMinistries: number;
  totalMembers: number;
  totalSongs: number;
  totalPlaylists: number;
}

interface DashboardViewProps {
  user: User;
  ministryId?: string;
}

export function DashboardView({ user, ministryId }: DashboardViewProps) {
  // If user is main admin, render the admin dashboard
  if (user.role === 'main_admin') {
    return <AdminDashboard user={user} />;
  }
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, isOffline } = useOfflineStatus();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // If no user, set error and return
        if (!user) {
          setError('User not authenticated');
          return;
        }

        // For non-main admin users, ministryId is required
        if (user.role !== 'main_admin' && !ministryId && !user.ministryId) {
          setError('Ministry ID is required');
          return;
        }

        // For main admin, we'll fetch all data without ministry filter
        const isMainAdmin = user.role === 'main_admin';
        const currentMinistryId = isMainAdmin ? undefined : (ministryId || user.ministryId);
        
        // Try to get cached data first if offline
        if (isOffline) {
          const cacheKey = `dashboard_stats_${isMainAdmin ? 'all' : currentMinistryId}`;
          const cachedStats = offlineCache.get<DashboardStats>(cacheKey);
          if (cachedStats) {
            setStats(cachedStats);
            setError(null);
            setIsLoading(false);
            return;
          }
        }
        
        // Fetch all statistics in parallel using blink client
        const [ministries, members, songs, playlists] = await Promise.all([
          // Always get all ministries to show total count
          blink.db.ministries.list(),
            
          // Members - all for main admin, filtered by ministry for others
          isMainAdmin 
            ? blink.db.users.list()
            : blink.db.users.list({ where: { ministryId: currentMinistryId } }),
          
          // Songs - all for main admin, filtered by ministry for others
          isMainAdmin
            ? blink.db.songs.list()
            : blink.db.songs.list({ where: { ministryId: currentMinistryId } }),
          
          // Playlists - all for main admin, filtered by ministry for others
          isMainAdmin
            ? blink.db.playlists.list()
            : blink.db.playlists.list({ where: { ministryId: currentMinistryId } }),
        ]);

        const newStats = {
          totalMinistries: ministries?.length || 0,
          totalMembers: members?.length || 0,
          totalSongs: songs?.length || 0,
          totalPlaylists: playlists?.length || 0,
        };

        setStats(newStats);
        
        // Cache the stats for offline use
        const cacheKey = `dashboard_stats_${isMainAdmin ? 'all' : currentMinistryId}`;
        offlineCache.set(cacheKey, newStats);
        
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        
        // Recalculate variables for catch block
        const isMainAdmin = user.role === 'main_admin';
        const currentMinistryId = isMainAdmin ? undefined : (ministryId || user.ministryId);
        
        // Try to use cached data as fallback
        const cacheKey = `dashboard_stats_${isMainAdmin ? 'all' : currentMinistryId}`;
        const cachedStats = offlineCache.get<DashboardStats>(cacheKey);
        
        if (cachedStats) {
          setStats(cachedStats);
          setError(isOffline ? null : 'Using cached data. Network connection unavailable.');
        } else {
          setError(isOffline 
            ? 'No cached data available. Please connect to the internet to load dashboard statistics.'
            : 'Failed to load dashboard statistics. Please try again later.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user, ministryId, isOnline, isOffline]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your ministry's data and activities
        </p>
        <OfflineIndicator />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Ministries"
          value={stats?.totalMinistries || 0}
          icon={<Church className="h-5 w-5" />}
          description={user.role === 'main_admin' 
            ? "Active churches/ministries" 
            : "Total churches/ministries"}
        />
        <StatsCard
          title="Total Members"
          value={stats?.totalMembers || 0}
          icon={<Users className="h-5 w-5" />}
          description="Including admins and members"
        />
        <StatsCard
          title="Songs"
          value={stats?.totalSongs || 0}
          icon={<Music className="h-5 w-5" />}
          description="In your song library"
        />
        <StatsCard
          title="Arrangements"
          value={stats?.totalPlaylists || 0}
          icon={<ListMusic className="h-5 w-5" />}
          description="Setlists and playlists"
        />
      </div>
    </div>
  );
}
