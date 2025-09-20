import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User as UserType } from '../App'
import { Users, CheckCircle, XCircle, Clock, Crown, Shield, UserIcon, Search, Trash2, Loader2 } from 'lucide-react'
import { useConfirm } from '../hooks/useConfirm'
import { useNotifications } from '../hooks/useNotifications'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

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
  const confirm = useConfirm()
  const { addNotification } = useNotifications()

  const loadUsers = useCallback(async () => {
    try {
      let userList
      
      if (user.role === 'main_admin') {
        // If main admin and a ministry is selected, show members of that ministry; otherwise show all users
        if (ministryId) {
          userList = await blink.db.users.list({
            where: { ministryId },
            orderBy: { name: 'asc' }
          })
        } else {
          userList = await blink.db.users.list({
            orderBy: { name: 'asc' }
          })
        }
      } else if (user.role === 'sub_admin' && user.ministryId) {
        // Sub admin sees only users from their ministry
        userList = await blink.db.users.list({
          where: { ministryId: user.ministryId },
          orderBy: { name: 'asc' }
        })
      } else {
        // Regular members can view other members of their joined ministry (approved + pending) (view-only)
        const targetMinistry = ministryId || user.ministryId
        if (targetMinistry) {
          // Load both approved and pending users for visibility
          userList = await blink.db.users.list({
            where: {
              AND: [
                { ministryId: targetMinistry },
                { OR: [ { status: 'approved' }, { status: 'pending' } ] }
              ]
            },
            orderBy: { name: 'asc' }
          })
        } else {
          userList = []
        }
      }
      
      setUsers((userList || []) as User[])
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [user.role, user.ministryId, ministryId])

  const loadJoinRequests = useCallback(async () => {
    try {
      let requests
      
      if (user.role === 'main_admin') {
        // Main admin sees all pending users across ministries
        requests = await blink.db.users.list({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' }
        })
      } else if (user.role === 'sub_admin' && user.ministryId) {
        // Sub admin sees only pending users for their ministry
        requests = await blink.db.users.list({
          where: { 
            ministryId: user.ministryId,
            status: 'pending'
          },
          orderBy: { createdAt: 'desc' }
        })
      }
      
      setJoinRequests((requests || []) as JoinRequest[])
    } catch (err) {
      console.error('Failed to load join requests:', err)
    }
  }, [user.role, user.ministryId])

  const loadMinistries = useCallback(async () => {
    try {
      const ministryList = await blink.db.ministries.list({
        orderBy: { name: 'asc' }
      })
      setMinistries(ministryList as Ministry[])
    } catch (err) {
      console.error('Failed to load ministries:', err)
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
      // Update user status to approved (requestId is the user ID)
      await blink.db.users.update(requestId, {
        status: 'approved'
      })

      // Send notification
      addNotification({
        title: 'Request Approved!',
        message: `Your request to join ${ministryName} has been approved. You can now access all ministry content.`,
        type: 'success',
        userId: requestId
      })

      // Reload data
      loadData()
    } catch (err) {
      console.error('Failed to approve request:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectRequest = async (requestId: string, userName: string, ministryId?: string) => {
    const ministryName = ministryId ? getMinistryName(ministryId) : 'the ministry'
    const ok = await confirm({
      title: 'Reject Join Request',
      message: `Reject ${userName}'s request to join? This cannot be undone.`,
      confirmText: 'Reject',
      cancelText: 'Cancel'
    })
    if (!ok) return

    setLoading(true)
    try {
      // Update user status to rejected (requestId is the user ID)
      await blink.db.users.update(requestId, {
        status: 'rejected'
      })

      // Send notification
      addNotification({
        title: 'Request Rejected',
        message: `Your request to join ${ministryName} has been rejected. Please contact an administrator for more information.`,
        type: 'error',
        userId: requestId
      })

      // Reload data
      loadData()
    } catch (err) {
      console.error('Failed to reject request:', err)
    } finally {
      setLoading(false)
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    const ok = await confirm({ message: `Are you sure you want to change this user's role to ${newRole}?` })
    if (!ok) return

    setLoading(true)
    try {
      await blink.db.users.update(userId, {
        role: newRole
      })

      // Reload data to reflect changes
      loadUsers()
    } catch (err) {
      console.error('Failed to change user role:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string, targetMinistryId?: string, targetRole?: string) => {
    // Determine if current user has permission to delete
    const canDelete = user.role === 'main_admin' || (
      user.role === 'sub_admin' && user.ministryId && targetMinistryId && user.ministryId === targetMinistryId && targetRole === 'user'
    )

    if (!canDelete) {
      console.warn('Insufficient permissions to delete user')
      return
    }

    const ok = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to permanently delete ${userName}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    if (!ok) return

    // Indicate deleting state for this user item
    setDeletingIds(prev => [...prev, userId])
    setLoading(true)
    try {
      // Delete the user from database
      await blink.db.users.delete(userId)

      // Send notification to inform user
      addNotification({
        title: 'Account Removed',
        message: `${userName}'s account has been removed by an administrator.`,
        type: 'error',
        userId: userId
      })

      // Reload data
      loadData()
    } catch (err) {
      console.error('Failed to delete user:', err)
    } finally {
      // Remove deleting state for this user
      setDeletingIds(prev => prev.filter(id => id !== userId))
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'main_admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'sub_admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-white" />
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
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Member Management</h2>
      </div>

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
        ) }
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
                            {getRoleIcon(userItem.role)}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(userItem.status)}`}>{userItem.status}</span>
                            {(user.role === 'main_admin' || (user.role === 'sub_admin' && user.ministryId)) && userItem.status === 'approved' && (
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground mr-2">Passcode:</span>
                                <code className="bg-muted px-2 py-1 rounded font-mono text-xs max-w-[160px] truncate inline-block">{userItem.pincode}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(user.role === 'main_admin' || (user.role === 'sub_admin' && user.ministryId && user.ministryId === userItem.ministryId)) && userItem.id !== user.id && (
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="p-2 rounded-full bg-background border border-border hover:bg-muted transition-colors"
                                title={getRoleLabel(userItem.role)}
                              >
                                {getRoleIcon(userItem.role)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0" align="end">
                              <div className="p-3">
                                <h4 className="text-sm font-medium mb-3 text-foreground">Change Role</h4>
                                <div className="space-y-2">
                                  <button
                                    onClick={() => changeUserRole(userItem.id, 'user')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                      userItem.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted text-foreground'
                                    }`}
                                  >
                                    <UserIcon className="h-4 w-4 text-white" />
                                    Member
                                  </button>
                                  <button
                                    onClick={() => changeUserRole(userItem.id, 'sub_admin')}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                      userItem.role === 'sub_admin'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted text-foreground'
                                    }`}
                                  >
                                    <Shield className="h-4 w-4 text-blue-500" />
                                    Ministry Admin
                                  </button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <button
                            onClick={() => handleDeleteUser(userItem.id, userItem.name, userItem.ministryId, userItem.role)}
                            className="p-2 rounded-full bg-transparent text-sm border border-border hover:bg-red-600 hover:text-white transition-colors"
                            title={`Delete ${userItem.name}`}
                            aria-label={`Delete ${userItem.name}`}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
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
                        <div className="text-sm text-muted-foreground mb-2">
                          <p>Wants to join: <span className="text-foreground">{ministry?.name || 'Unknown Ministry'}</span></p>
                          <p>Passcode: {request.pincode}</p>
                          <p>Requested: {new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.name || request.id, request.ministryId || '')}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id, request.name || request.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
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