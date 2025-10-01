import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, UserCheck, UserX, Clock, AlertCircle, CheckCircle, XCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

type AvailabilityStatus = 'available' | 'unavailable' | 'undecided';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  availability: AvailabilityStatus;
  // Add other fields that exist in your database
  profilePhoto?: string;
  customTag?: string;
  tagColor?: string;
  status?: string;
}

interface AvailabilityProps {
  user: User & { 
    id: string;
    customTag?: string;
    tagColor?: string;
  };
  ministryId?: string;
}

export function Availability({ user, ministryId }: AvailabilityProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch team availability
  const fetchTeamAvailability = async () => {
    if (!ministryId) {
      console.error('No ministryId provided');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const url = `http://localhost:4000/api/availability/team?ministryId=${ministryId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch team availability: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Map the data to ensure it matches our TeamMember interface
      // Convert snake_case to camelCase for consistency with TypeScript conventions
      const formattedData = data.map((member: any) => ({
        id: member.id,
        name: member.name || 'Unknown User',
        role: member.role || 'member',
        availability: member.availability || 'undecided',
        // Map snake_case to camelCase
        profilePhoto: member.profile_photo,
        customTag: member.custom_tag,
        tagColor: member.tag_color,
        status: member.status
      }));
      
      setTeamMembers(formattedData);
      
      // Set current user from the team members
      const current = formattedData.find((m: TeamMember) => m.id === user.id);
      if (current) {
        setCurrentUser(current);
      } else if (user.id) {
        // If user not found in team, create a default entry
        const defaultUser: TeamMember = {
          id: user.id,
          name: user.name || 'Unknown User',
          role: user.role || 'member',
          availability: 'undecided',
          customTag: user.customTag,
          tagColor: user.tagColor
        };
        setCurrentUser(defaultUser);
      }
    } catch (error) {
      console.error('Error fetching team availability:', error);
      toast.error(`Failed to load team availability: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on component mount and when ministryId changes
  useEffect(() => {
    if (ministryId) {
      fetchTeamAvailability();
    }
  }, [ministryId]);

  // Update availability in the API
  const updateAvailability = async (newStatus: AvailabilityStatus) => {
    if (!currentUser || !user.id) {
      console.error('Missing currentUser or user.id');
      return;
    }
    
    if (currentUser.availability === newStatus) {
      return; // No change needed
    }
    
    setIsUpdating(true);
    
    try {
      const payload = { 
        userId: user.id,
        status: newStatus,
        notes: `Updated by ${user.name}`
      };
      
      const response = await fetch('http://localhost:4000/api/availability', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Credentials': 'true'
        },
        body: JSON.stringify(payload),
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error updating availability:', response.status, response.statusText);
        throw new Error(`Failed to update availability: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      // Keep minimal logging for successful updates
      console.log('Availability updated successfully');

      // Update local state
      const updatedUser = { ...currentUser, availability: newStatus };
      setCurrentUser(updatedUser);
      
      // Update in team members list
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === user.id ? updatedUser : member
        )
      );

      toast.success('Availability updated successfully!', {
        position: 'top-right',
        icon: <CheckCircle2 className="text-green-500" />,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error(`Failed to update availability: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      worship_leader: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      vocalist: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      guitarist: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pianist: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      drummer: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      bassist: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };

    const formattedRole = role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return (
      <Badge className={`text-xs ${roleColors[role] || roleColors.default}`}>
        {formattedRole}
      </Badge>
    );
  };

  const getStatusIcon = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'undecided':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading availability...</span>
      </div>
    );
  }

  const availableMembers = teamMembers.filter(m => m.availability === 'available');
  const unavailableMembers = teamMembers.filter(m => m.availability === 'unavailable');
  const undecidedMembers = teamMembers.filter(m => m.availability === 'undecided');

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Team Availability</h2>
        <p className="text-muted-foreground">
          Manage and track team member availability for upcoming services
        </p>
      </div>

      {/* Alert Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 dark:bg-yellow-900/20 dark:border-yellow-500">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Reminder:</strong> Please update your availability for this week's services. 
              Your status will be visible to your team leaders.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Availability Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                My Availability
              </CardTitle>
              <CardDescription>
                Update your availability status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    {user.customTag && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                            style={{ backgroundColor: user.tagColor || '#e2e8f0' }}>
                        {user.customTag}
                      </span>
                    )}
                    {getRoleBadge(currentUser?.role || 'member')}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center">
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${
                          currentUser?.availability === 'available' 
                            ? 'border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200'
                            : currentUser?.availability === 'unavailable'
                            ? 'border-red-200 bg-red-50 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'
                            : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200'
                        }`}
                      >
                        {currentUser?.availability === 'available' && <CheckCircle className="h-4 w-4" />}
                        {currentUser?.availability === 'unavailable' && <XCircle className="h-4 w-4" />}
                        {currentUser?.availability === 'undecided' && <AlertCircle className="h-4 w-4" />}
                        <span className="capitalize">
                          {currentUser?.availability || 'Not set'}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant={currentUser?.availability === 'available' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => updateAvailability('available')}
                    disabled={isUpdating}
                  >
                    {currentUser?.availability === 'available' && <CheckCircle2 className="h-4 w-4" />}
                    <span>I'm Available</span>
                    {isUpdating && currentUser?.availability === 'available' && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                  <Button
                    variant={currentUser?.availability === 'unavailable' ? 'destructive' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => updateAvailability('unavailable')}
                    disabled={isUpdating}
                  >
                    {currentUser?.availability === 'unavailable' && <XCircle className="h-4 w-4" />}
                    <span>Not Available</span>
                    {isUpdating && currentUser?.availability === 'unavailable' && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                  <Button
                    variant={currentUser?.availability === 'undecided' ? 'secondary' : 'outline'}
                    className="w-full justify-start gap-2"
                    onClick={() => updateAvailability('undecided')}
                    disabled={isUpdating}
                  >
                    {currentUser?.availability === 'undecided' && <AlertCircle className="h-4 w-4" />}
                    <span>Undecided</span>
                    {isUpdating && currentUser?.availability === 'undecided' && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Availability */}
        <div className="lg:col-span-2 space-y-6">
          {/* Available Members */}
          {availableMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <UserCheck className="h-5 w-5" />
                <h3 className="font-medium">Available ({availableMembers.length})</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <div className="text-sm text-muted-foreground">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200">
                      Available
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unavailable Members */}
          {unavailableMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <UserX className="h-5 w-5" />
                <h3 className="font-medium">Unavailable ({unavailableMembers.length})</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {unavailableMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <div className="text-sm text-muted-foreground">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">
                      Unavailable
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Undecided Members */}
          {undecidedMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Users className="h-5 w-5" />
                <h3 className="font-medium">Undecided ({undecidedMembers.length})</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {undecidedMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <div className="text-sm text-muted-foreground">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-yellow-200 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200">
                      Undecided
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No team members found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
