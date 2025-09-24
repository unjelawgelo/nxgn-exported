import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { User as UserType } from '../App'
import { Users, CheckCircle, XCircle, Clock, Crown, Shield, UserIcon, Search, Trash2, Loader2 } from 'lucide-react'
import { useConfirm } from '../hooks/useConfirm'
import { useNotifications } from '../hooks/useNotifications'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { PageSkeleton, ListSkeleton } from './ui/loading-skeleton'

interface User {
  id: string
  name: string
  pincode: string
  role: string
  ministryId?: string
  status: string
  profilePhoto?: string
  customTag?: string
  tagColor?: string
}

interface JoinRequest {
  id: string
  name: string
  pincode: string
  role: string
  ministryId?: string
  status: string
  createdAt: string
}

interface Ministry {
  id: string
  name: string
}

interface UserManagerProps {
  user: UserType
  ministryId?: string
}

export default function UserManager({ user, ministryId }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users')
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const { addNotification, showSuccess } = useNotifications()
  const confirm = useConfirm()

  const changeUserRole = async (userId: string, newRole: string) => {
    // Close any open popovers before showing confirmation
    setOpenPopoverId(null);
    
    // Get the user's current name for the confirmation message
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
      return;
    }
    
    const userName = userToUpdate.name || 'this user';
    const roleName = newRole === 'admin' ? 'Admin' : newRole === 'sub_admin' ? 'Leader' : 'Member';
    
    try {
      // Show confirmation dialog
      const isConfirmed = await confirm({
        title: 'Confirm Role Change',
        message: `Are you sure you want to change ${userName}'s role to ${roleName}?`,
        confirmText: 'Yes, change role',
        cancelText: 'Cancel',
        variant: 'default',
      });
      
      if (!isConfirmed) {
        console.log('User cancelled the role change');
        return;
      }
      
      console.log('User confirmed role change, proceeding...');
      
      setLoading(true);
      
      // Close any remaining popovers
      setOpenPopoverId(null);
      
      // Optimistically update the UI
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
      
      // Make the API call
      const response = await api.patch(`/users/${userId}`, { role: newRole });
      
      // The API returns the updated user object directly, not in response.data
      if (response && response.id) {
        // Ensure the UI matches the server state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, ...response } : user
          )
        );
        
        // Show success notification
        try {
          showSuccess(
            'Role Updated', 
            `${userName} is now a ${roleName}`
          );
        } catch (notifError) {
          // Silent error for notification failure
        }
      }
    } catch (error) {
      try {
        addNotification({
          title: 'Error',
          message: 'Failed to update user role',
          type: 'error'
        });
      } catch (notifError) {
        // Silent error for notification failure
      }
    } finally {
      setLoading(false);
    }
  }

  const loadUsers = useCallback(async () => {
    try {
      let userList = [];
      
      if (user.role === 'main_admin') {
        // Build query parameters for main admin
        const params = new URLSearchParams();
        params.append('status', 'approved');
        if (ministryId) {
          params.append('ministryId', ministryId);
        }
        
        const result = await api.get(`/users?${params.toString()}`);
        userList = Array.isArray(result) ? result.filter((u: any) => u.status === 'approved') : [];
        
      } else if (user.role === 'sub_admin' && user.ministryId) {
        // Sub admin sees only approved users from their ministry
        const result = await api.get(`/users?ministryId=${user.ministryId}&status=approved`);
        userList = Array.isArray(result) ? result.filter((u: any) => u.status === 'approved') : [];
        
      } else {
        // Regular members can view other members of their joined ministry (approved only)
        const targetMinistry = ministryId || user.ministryId;
        if (targetMinistry) {
          const result = await api.get(`/users?ministryId=${targetMinistry}&status=approved`);
          userList = Array.isArray(result) ? result.filter((u: any) => u.status === 'approved') : [];
        }
      }
      
      // Sort users by name
      userList.sort((a: User, b: User) => a.name.localeCompare(b.name));
      setUsers(userList as User[]);
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [user.role, user.ministryId, ministryId]) // Add dependency on ministryId to reload when it changes

  const loadJoinRequests = useCallback(async () => {
    try {
      let requests = [];
      
      if (user.role === 'main_admin') {
        // Build query parameters for main admin
        const params = new URLSearchParams();
        params.append('status', 'pending');
        if (ministryId) {
          params.append('ministryId', ministryId);
        }
        
        const result = await api.get(`/users?${params.toString()}`);
        requests = Array.isArray(result) ? result.filter((req: any) => req.status === 'pending') : [];
        
      } else if (user.role === 'sub_admin' && user.ministryId) {
        // Sub admin sees only pending users for their ministry
        const result = await api.get(`/users?ministryId=${user.ministryId}&status=pending`);
        requests = Array.isArray(result) ? result.filter((req: any) => req.status === 'pending') : [];
      }
      
      // Sort by creation date (newest first)
      requests.sort((a: JoinRequest, b: JoinRequest) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setJoinRequests(requests as JoinRequest[]);
      
    } catch (err) {
      console.error('Failed to load join requests:', err);
      // Even if there's an error, ensure we don't show stale data
      setJoinRequests([]);
    }
  }, [user.role, user.ministryId, ministryId])

  const loadMinistries = useCallback(async () => {
    try {
      const ministryList = await api.get('/ministries');
      if (Array.isArray(ministryList)) {
        // Sort ministries by name
        const sorted = [...ministryList].sort((a: Ministry, b: Ministry) => 
          a.name.localeCompare(b.name)
        );
        setMinistries(sorted as Ministry[]);
      }
    } catch (err) {
      console.error('Failed to load ministries:', err);
      setMinistries([]);
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUsers(),
        loadJoinRequests(),
        loadMinistries()
      ])
    } finally {
      setLoading(false)
    }
  }, [loadUsers, loadJoinRequests, loadMinistries])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const canViewRequests = user.role === 'main_admin' || (user.role === 'sub_admin' && user.ministryId)
    if (!canViewRequests && activeTab === 'requests') {
      setActiveTab('users')
    }
  }, [user.role, user.ministryId, activeTab])

  const handleApproveRequest = async (requestId: string, userName: string, ministryId: string) => {
    const ministryName = getMinistryName(ministryId)
    const ok = await confirm({
      title: 'Approve Join Request',
      message: `Approve ${userName} to join ${ministryName}?`,
      confirmText: 'Approve',
      cancelText: 'Cancel'
    })
    if (!ok) return

    setLoading(true)
    try {
      // First, update the user in the database
      const updatedUser = await api.patch(`/users/${requestId}`, {
        status: 'approved',
        // Ensure the ministryId is set in case it wasn't before
        ministryId: ministryId
      })

      if (!updatedUser) {
        throw new Error('Failed to update user in database')
      }

      // Update both join requests and users lists in a single state update
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
      
      setUsers(prev => {
        const userExists = prev.some(u => u.id === requestId)
        if (userExists) {
          // Update existing user
          return prev.map(u => 
            u.id === requestId 
              ? { ...u, status: 'approved', ministryId: ministryId }
              : u
          )
        } else {
          // Add new user to the list if not present
          const request = joinRequests.find(r => r.id === requestId)
          if (request) {
            return [...prev, { ...request, status: 'approved', ministryId: ministryId }]
              .sort((a, b) => a.name.localeCompare(b.name))
          }
          return prev
        }
      })

      // Send notification to the user
      // addNotification({
      //   title: 'Request Approved!',
      //   message: `Your request to join ${ministryName} has been approved. You can now access all ministry content.`,
      //   type: 'success',
      //   userId: requestId
      // })

      // Show success message to admin
      addNotification({
        title: 'Success',
        message: `${userName}'s request has been approved.`,
        type: 'success'
      })
    } catch (err) {
      console.error('Failed to approve request:', err)
      addNotification({
        title: 'Error',
        message: `Failed to approve request: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      })
      // Reload data to ensure UI is in sync with the database
      loadData()
    } finally {
      setLoading(false)
    }
  }

  const handleRejectRequest = async (requestId: string, userName: string) => {
    const ok = await confirm({
      title: 'Delete Join Request',
      message: `Are you sure you want to permanently delete ${userName}'s join request? This action cannot be undone and all their data will be lost.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (!ok) return;

    setLoading(true);
    try {
      // Permanently delete the user from the database
      await api.delete(`/users/${requestId}`);

      // Update all relevant states
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      setUsers(prev => prev.filter(u => u.id !== requestId));

      // Show success message
      addNotification({
        title: 'Request Deleted',
        message: `${userName}'s join request has been permanently deleted.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to delete user:', err);
      addNotification({
        title: 'Error',
        message: `Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, targetMinistryId?: string, targetRole?: string) => {
    // Determine if current user has permission to delete
    const isMainAdmin = user.role === 'main_admin';
    const isSubAdmin = user.role === 'sub_admin' && user.ministryId;
    const isTargetInSameMinistry = user.ministryId && targetMinistryId && user.ministryId === targetMinistryId;
    const isTargetRegularUser = targetRole === 'user';
    
    const canDelete = isMainAdmin || (isSubAdmin && isTargetInSameMinistry && isTargetRegularUser);

    if (!canDelete) {
      console.warn('Insufficient permissions to delete user');
      addNotification({
        title: 'Permission Denied',
        message: 'You do not have permission to delete this user.',
        type: 'error'
      });
      return;
    }

    const ok = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to permanently delete ${userName}? This action cannot be undone and will remove all their data.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (!ok) return;

    // Indicate deleting state for this user item
    setDeletingIds(prev => [...prev, userId]);
    
    try {
      // Permanently delete the user from the database
      await api.delete(`/users/${userId}`);

      // Update the UI by removing the user from the list
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // Also remove from join requests if present
      setJoinRequests(prevRequests => prevRequests.filter(request => request.id !== userId));

      // Notify user of successful deletion
      addNotification({
        title: 'User Deleted',
        message: `${userName} has been permanently deleted.`,
        type: 'success'
      });
      
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      addNotification({
        title: 'Error',
        message: `Failed to deactivate user: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      // Remove deleting state for this user
      setDeletingIds(prev => prev.filter(id => id !== userId));
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'main_admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'sub_admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-white-500" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'main_admin':
        return 'Main Admin'
      case 'sub_admin':
        return 'Ministry Admin'
      default:
        return 'Member'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'rejected':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getMinistryName = (ministryId?: string) => {
    if (!ministryId) return 'No Ministry'
    const ministry = ministries.find(m => m.id === ministryId)
    return ministry?.name || 'Unknown Ministry'
  }

  const getUserFromRequest = (request: JoinRequest) => {
    return request // request is already a user object
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.customTag && u.customTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.pincode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequestsCount = joinRequests.filter(r => r.status === 'pending').length

  if (loading && users.length === 0) {
    return (
      <PageSkeleton 
        withHeader={true}
        withSearch={true}
        withFilters={true}
        contentSkeleton={() => (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="h-8 w-8 bg-muted rounded-full"></div>
              </div>
            </div>
            <ListSkeleton count={4} />
          </div>
        )}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Member Management</h2>
      </div>

      {/* ... (rest of the code remains the same) */}
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'users'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({users.length})
          </div>
        </button>
        
        { (user.role === 'main_admin' || (user.role === 'sub_admin' && user.ministryId)) && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Join Requests
              {pendingRequestsCount > 0 && (
                <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs">
                  {pendingRequestsCount}
                </span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'users' ? (
        <div className="flex-1 flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto pb-20 pt-1 max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Users Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users match your search' : 'No users in the system yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((userItem) => (
                  <div
                    key={userItem.id}
                    className="relative min-w-0 bg-card border border-border rounded-lg p-4 overflow-hidden transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary flex-shrink-0 overflow-hidden flex items-center justify-center text-primary-foreground">
                          {userItem.profilePhoto ? (
                            <img src={userItem.profilePhoto} alt={userItem.name} className="w-full h-full object-cover" />
                          ) : (
                            userItem.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">{userItem.name}</h3>
                            {userItem.customTag && (
                              <span
                                className="inline-flex px-2 py-1 rounded text-xs font-medium items-center gap-1 max-w-[120px] truncate overflow-hidden"
                                style={{
                                  backgroundColor: `${userItem.tagColor || '#8B5CF6'}20`,
                                  color: userItem.tagColor || '#8B5CF6',
                                  border: `1px solid ${userItem.tagColor || '#8B5CF6'}40`
                                }}
                              >
                                {userItem.customTag}
                              </span>
                            )}
                            {userItem.role === 'main_admin' && getRoleIcon(userItem.role)}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(userItem.status)}`}>{userItem.status}</span>
                            {userItem.status === 'approved' && userItem.role !== 'main_admin' && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">Code:</span>
                                <code className="font-mono font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                                  {userItem.pincode}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(user.role === 'main_admin' || 
                        (user.role === 'sub_admin' && 
                         user.ministryId && 
                         user.ministryId === userItem.ministryId && 
                         userItem.role !== 'main_admin' && 
                         userItem.role !== 'sub_admin')) && 
                       userItem.id !== user.id && (
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                          <Popover open={openPopoverId === userItem.id} onOpenChange={(open) => {
                            setOpenPopoverId(open ? userItem.id : null)
                          }}>
                            <PopoverTrigger asChild>
                              <button
                                className="p-2 rounded-full bg-background border border-border hover:bg-muted transition-colors"
                                title={getRoleLabel(userItem.role)}
                              >
                                {getRoleIcon(userItem.role)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-56 p-0" 
                              align="end"
                              onInteractOutside={(e) => {
                                // Prevent closing when clicking on the popover content
                                const target = e.target as HTMLElement;
                                if (target.closest('.popover-content')) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <div className="p-3">
                                <h4 className="text-sm font-medium mb-3 text-foreground">Change Role</h4>
                                <div className="space-y-2">
                                  <div className="space-y-2 w-full">
                                    {(user.role === 'main_admin' || 
                                      (user.role === 'sub_admin' && user.ministryId === userItem.ministryId && userItem.role === 'user')) && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          // Close any open popovers
                                          setOpenPopoverId(null);
                                          
                                          const confirmed = await confirm({
                                            title: 'Delete User',
                                            message: `Are you sure you want to remove ${userItem.name}? This action cannot be undone.`,
                                            confirmText: 'Delete',
                                            cancelText: 'Cancel',
                                            variant: 'destructive'
                                          });
                                          if (confirmed) {
                                            handleDeleteUser(userItem.id, userItem.name, userItem.ministryId, userItem.role);
                                          }
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                      >
                                        <span>Delete User</span>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        changeUserRole(userItem.id, 'user');
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        userItem.role === 'user'
                                          ? 'bg-primary text-primary-foreground'
                                          : 'hover:bg-muted text-foreground'
                                      }`}
                                      disabled={userItem.role === 'main_admin'}
                                    >
                                      <UserIcon className="h-4 w-4" />
                                      <span>Member</span>
                                    </button>
                                    {(user.role === 'main_admin' || (user.role === 'sub_admin' && user.ministryId)) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          changeUserRole(userItem.id, 'sub_admin');
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                          userItem.role === 'sub_admin'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted text-foreground'
                                        }`}
                                        disabled={userItem.role === 'main_admin'}
                                      >
                                        <Shield className="h-4 w-4 text-blue-500" />
                                        <span>Ministry Admin</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-8 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {joinRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Pending Requests</h3>
              <p className="text-muted-foreground">All join requests have been processed</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {joinRequests.map((request) => {
                const requestUser = getUserFromRequest(request)
                const ministry = ministries.find(m => m.id === request.ministryId)
                
                return (
                  <div
                    key={request.id}
                    className="relative min-w-0 bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1 truncate">
                          {request.name || 'Unknown User'}
                        </h3>
                        <div className="space-y-1.5 text-sm text-muted-foreground mb-2">
                          <p>Wants to join: <span className="text-foreground">{ministry?.name || 'Unknown Ministry'}</span></p>
                          <div className="flex items-center gap-1.5">
                            <span>Code:</span>
                            <code className="font-mono font-medium bg-muted/50 px-1.5 py-0.5 rounded text-xs">
                              {request.pincode}
                            </code>
                          </div>
                          <p className="text-xs">Requested: {new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-stretch gap-3 ml-4 flex-shrink-0 w-32">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.name || request.id, request.ministryId || '')}
                          className="group relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-medium transition-all duration-200 rounded-lg w-full 
                            bg-black hover:bg-gray-900
                            border border-green-400 text-green-400
                            hover:bg-opacity-10 hover:border-green-300 hover:text-green-300"
                          disabled={loading}
                        >
                          <span className="relative flex items-center justify-center gap-2 text-sm font-medium w-full">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">Approve</span>
                          </span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id, request.name || request.id)}
                          className="group relative inline-flex items-center justify-center px-4 py-2 overflow-hidden font-medium transition-all duration-200 rounded-lg w-full 
                            bg-black hover:bg-gray-900
                            border border-red-400 text-red-400
                            hover:bg-opacity-10 hover:border-red-300 hover:text-red-300"
                          disabled={loading}
                        >
                          <span className="relative flex items-center justify-center gap-2 text-sm font-medium w-full">
                            <XCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">Reject</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}