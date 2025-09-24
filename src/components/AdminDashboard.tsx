import { useEffect, useState } from 'react';
import { User } from '../App';
import { api } from '../lib/api';
import { Users, Shield, FileText, BarChart2, Settings, AlertCircle, ListMusic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { DashboardSkeleton } from './ui/dashboard-skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AdminStats {
  totalUsers: number;
  totalMinistries: number;
  totalSongs: number;
  totalArrangements: number;
  systemStatus: 'operational' | 'degraded' | 'maintenance';
}

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalMinistries: 0,
    totalSongs: 0,
    totalArrangements: 0,
    systemStatus: 'operational'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setIsLoading(true);
        
        // First, get all ministries to be able to fetch their data
        const ministries = await api.get('/ministries').catch(() => []);
        
        // Get all users
        const users = await api.get('/users').catch(() => []);
        
        // Get songs and playlists for each ministry and sum them up
        let totalSongs = 0;
        let totalPlaylists = 0;
        
        if (ministries.length > 0) {
          // Get songs for each ministry
          const songPromises = ministries.map((ministry: any) => 
            api.get(`/songs?ministryId=${ministry.id}`).catch(() => [])
          );
          
          // Get playlists for each ministry
          const playlistPromises = ministries.map((ministry: any) =>
            api.get(`/playlists?ministryId=${ministry.id}`).catch(() => [])
          );
          
          // Wait for all API calls to complete
          const [allSongs, allPlaylists] = await Promise.all([
            Promise.all(songPromises),
            Promise.all(playlistPromises)
          ]);
          
          // Sum up the results
          totalSongs = allSongs.reduce((sum, songs) => sum + (songs?.length || 0), 0);
          totalPlaylists = allPlaylists.reduce((sum, playlists) => sum + (playlists?.length || 0), 0);
        }

        setStats({
          totalUsers: users?.length || 0,
          totalMinistries: ministries?.length || 0,
          totalSongs,
          totalArrangements: totalPlaylists,
          systemStatus: 'operational'
        });
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
        setError('Some data may not be up to date. The system is still functional.');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'main_admin') {
      fetchAdminStats();
    }
  }, [user]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Overview of system-wide metrics and administration
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Partial Data Available</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="h-full transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground pt-2">
              Across all ministries
            </p>
          </CardContent>
        </Card>

        <Card className="h-full transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
            <CardTitle className="text-sm font-medium">Total Ministries</CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <Shield className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalMinistries}</div>
            <p className="text-xs text-muted-foreground pt-2">
              Registered ministries
            </p>
          </CardContent>
        </Card>

        <Card className="h-full transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
            <p className="text-xs text-muted-foreground pt-2">
              In the library
            </p>
          </CardContent>
        </Card>

        <Card className="h-full transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
            <CardTitle className="text-sm font-medium">Playlists</CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <ListMusic className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalArrangements}</div>
            <p className="text-xs text-muted-foreground pt-2">
              {stats.totalArrangements === 1 ? 'Playlist' : 'Playlists'} across all ministries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and System Info */}
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Create New Ministry
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BarChart2 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              System Settings
            </Button>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">Environment</span>
              <span className="text-sm font-medium">
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
