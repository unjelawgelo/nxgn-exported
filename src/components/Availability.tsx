import { useState, useEffect } from 'react';
import { User } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, UserCheck, UserX, Clock, AlertCircle, CheckCircle, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Mock data for team members (in a real app, this would come from an API)
const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'worship_leader', availability: 'available' as const },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'vocalist', availability: 'unavailable' as const },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'guitarist', availability: 'available' as const },
  { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', role: 'pianist', availability: 'undecided' as const },
  { id: '5', name: 'David Brown', email: 'david@example.com', role: 'drummer', availability: 'available' as const },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  availability: 'available' | 'unavailable' | 'undecided';
}

interface AvailabilityProps {
  user: User;
  ministryId?: string;
}

export function Availability({ user, ministryId }: AvailabilityProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isStatusSaved, setIsStatusSaved] = useState(true);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // Initialize current user from the team members
  useEffect(() => {
    // Only run this effect when the component mounts or when the user prop changes
    const initializeUser = () => {
      setTeamMembers(prev => {
        // Check if user already exists in team members by email
        const existingUser = prev.find(member => member.email === user.email);
        
        if (existingUser) {
          // If user exists, use the existing data
          setCurrentUser(existingUser);
          return prev; // Return previous state to prevent unnecessary updates
        } else {
          // If user doesn't exist, create new user data with a unique ID
          const newUser: TeamMember = {
            id: user.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: user.name,
            email: user.email,
            role: user.role || 'member',
            availability: 'undecided'
          };
          
          setCurrentUser(newUser);
          
          // Filter out any existing entries with the same email to prevent duplicates
          const filteredMembers = prev.filter(member => member.email !== user.email);
          return [...filteredMembers, newUser];
        }
      });
    };
    
    initializeUser();
  }, [user]);

  const updateAvailability = (newStatus: 'available' | 'unavailable' | 'undecided') => {
    if (!currentUser) return;
    
    // Only update if the status is actually changing
    if (currentUser.availability === newStatus) return;
    
    const updatedUser = { ...currentUser, availability: newStatus };
    setCurrentUser(updatedUser);
    
    setTeamMembers(prev => 
      prev.map(member => 
        member.email === user.email ? updatedUser : member
      )
    );
    
    // Show save button and mark as unsaved when status changes
    setShowSaveButton(true);
    setIsStatusSaved(false);
  };
  
  const handleSaveStatus = () => {
    // In a real app, you would save to an API here
    setIsStatusSaved(true);
    setShowSaveButton(false);
    
    // Show success toast
    toast.success('Availability saved successfully!', {
      position: 'top-right',
      icon: <CheckCircle2 className="text-green-500" />,
      duration: 3000,
    });
  };
  
  const handleChangeStatus = () => {
    setIsStatusSaved(false);
    setShowSaveButton(true);
    
    // Show warning toast
    toast('Updating your status...', {
      position: 'top-right',
      icon: <AlertTriangle className="text-yellow-500" />,
      duration: 2000,
    });
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'available': return 'unavailable';
      case 'unavailable': return 'undecided';
      case 'undecided': 
      default: return 'available';
    }
  };

  const availableMembers = teamMembers.filter(member => member.availability === 'available');
  const unavailableMembers = teamMembers.filter(member => member.availability === 'unavailable');
  const undecidedMembers = teamMembers.filter(member => member.availability === 'undecided');

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      worship_leader: 'bg-purple-100 text-purple-800',
      vocalist: 'bg-blue-100 text-blue-800',
      guitarist: 'bg-green-100 text-green-800',
      pianist: 'bg-yellow-100 text-yellow-800',
      drummer: 'bg-red-100 text-red-800',
      bassist: 'bg-indigo-100 text-indigo-800',
      default: 'bg-gray-100 text-gray-800'
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

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Team Availability</h2>
        <p className="text-muted-foreground">
          Manage and track team member availability for upcoming services
        </p>
      </div>

      {/* Alert Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
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
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {getRoleBadge(currentUser?.role || 'member')}
                  </div>
                  <div className="text-right">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <div className="flex items-center">
                        <Badge 
                          className={`${
                            currentUser?.availability === 'available' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                              : currentUser?.availability === 'unavailable'
                                ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          }`}
                        >
                          {currentUser?.availability === 'available' ? 'Available' : 
                           currentUser?.availability === 'unavailable' ? 'Not Available' : 'Undecided'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`transition-all duration-400 ease-in-out overflow-hidden transform-gpu will-change-[max-height,opacity,margin] ${
                  showSaveButton 
                    ? 'max-h-40 opacity-100 mt-4' 
                    : 'max-h-0 opacity-0 mt-0 overflow-hidden pointer-events-none'
                }`}>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateAvailability('available');
                      }}
                      variant={currentUser?.availability === 'available' ? 'default' : 'outline'}
                      className={`${currentUser?.availability === 'available' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      Available
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateAvailability('unavailable');
                      }}
                      variant={currentUser?.availability === 'unavailable' ? 'default' : 'outline'}
                      className={`${currentUser?.availability === 'unavailable' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      Unavailable
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateAvailability('undecided');
                      }}
                      variant={currentUser?.availability === 'undecided' ? 'default' : 'outline'}
                      className={`${currentUser?.availability === 'undecided' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                    >
                      Undecided
                    </Button>
                  </div>
                </div>
                
                <div className={`transition-all duration-500 ease-in-out overflow-hidden transform-gpu will-change-[max-height,opacity,margin] ${
                  (showSaveButton || isStatusSaved) 
                    ? 'max-h-32 opacity-100 mt-4' 
                    : 'max-h-0 opacity-0 mt-0 pointer-events-none overflow-hidden'
                }`}>
                  <div className={`transition-all duration-400 ease-in-out ${!showSaveButton ? 'pt-0 border-t-0' : 'pt-4 border-t'} flex gap-2`}>
                    {isStatusSaved && (
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleChangeStatus();
                        }}
                      >
                        Change Status
                      </Button>
                    )}
                    {showSaveButton && (
                      <Button 
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveStatus();
                        }}
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center pt-2">
                  <AlertCircle className="h-3 w-3 inline-block mr-1" />
                  {isStatusSaved 
                    ? "Click 'Change Status' below to update your availability" 
                    : "Undecided status will be cleared every Tuesday at 9 PM"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Team Members */}
      <div className="space-y-6 lg:col-span-1">
        <Card className="h-auto lg:h-full">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
              <UserCheck className="h-5 w-5" />
              Available ({availableMembers.length})
            </CardTitle>
            <CardDescription className="text-green-700">
              Team members available this week
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {availableMembers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No team members are available
              </div>
            ) : (
              <div className="divide-y">
                {availableMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Undecided Team Members */}
        <Card className="h-auto lg:h-full">
          <CardHeader className="bg-yellow-50">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              Undecided ({undecidedMembers.length})
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Please update your status by Tuesday 9 PM
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {undecidedMembers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No undecided team members
              </div>
            ) : (
              <div className="divide-y">
                {undecidedMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <Clock className="h-5 w-5 text-yellow-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {/* Unavailable Team Members */}
      <div className="lg:col-span-1">
        <Card className="h-auto lg:h-full">
          <CardHeader className="bg-white border-b">
            <CardTitle className="text-lg flex items-center gap-2 text-red-800">
              <UserX className="h-5 w-5" />
              Unavailable ({unavailableMembers.length})
            </CardTitle>
            <CardDescription className="text-red-700">
              Team members not available this week
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {unavailableMembers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                All team members are available
              </div>
            ) : (
              <div className="divide-y">
                {unavailableMembers.map((member) => (
                  <div key={member.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
