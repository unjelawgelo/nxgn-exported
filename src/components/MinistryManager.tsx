import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Home, Plus, Pencil, Trash, Users, Shield, User as UserIcon, Loader2, Eye } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { PageSkeleton, ListSkeleton } from './ui/loading-skeleton'

interface Ministry {
  id: string
  name: string
  passcode: string
  adminId?: string
  description?: string
  profilePhoto?: string
}

interface User {
  id: string
  name: string
  role: string
  ministryId?: string
  status: string
  profilePhoto?: string
  customTag?: string
  tagColor?: string
}

interface MinistryManagerProps {
  userRole?: 'main_admin' | 'sub_admin' | 'user';
}

export default function MinistryManager({ userRole = 'user' }: MinistryManagerProps) {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [expandedMinistryId, setExpandedMinistryId] = useState<string | null>(null)
  const [ministryUsers, setMinistryUsers] = useState<{[key: string]: User[]}>({})

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [passcode, setPasscode] = useState('')
  const [adminId, setAdminId] = useState('__none')

  const notifications = useNotifications()
  const confirm = useConfirm()

  useEffect(() => {
    loadMinistries()
    loadUsers()
  }, [])

  const loadMinistries = async () => {
    setLoading(true)
    try {
      const ministryList = await blink.db.ministries.list({
        orderBy: { name: 'asc' }
      })
      setMinistries(ministryList as Ministry[])
    } catch (err) {
      console.error('Failed to load ministries:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const userList = await blink.db.users.list({
        orderBy: { name: 'asc' }
      })
      setUsers(userList as User[])
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const generatePasscode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPasscode(result)
  }

  const handleAddMinistry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !passcode) return

    setLoading(true)
    try {
      const newMinistry = {
        id: `ministry-${Date.now()}`,
        name,
        passcode,
        adminId: adminId === '__none' ? undefined : adminId,
        description
      }

      await blink.db.ministries.create(newMinistry)
      
      // Update user role to sub_admin if assigned
      if (adminId && adminId !== '__none') {
        await blink.db.users.update(adminId, {
          role: 'sub_admin',
          ministryId: newMinistry.id,
          status: 'approved'
        })
      }
      
      setMinistries([...ministries, newMinistry as Ministry])
      setShowAddModal(false)
      resetForm()
      loadUsers() // Reload to reflect role changes
      notifications.showSuccess('Ministry created', 'New ministry created')
    } catch (err) {
      console.error('Failed to add ministry:', err)
      notifications.showError('Add failed', 'Unable to create ministry')
    } finally {
      setLoading(false)
    }
  }

  const handleEditMinistry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !passcode || !editingMinistry) return

    setLoading(true)
    try {
      // Normalize adminId when using the select placeholder value
      const cleanAdminId = adminId === '__none' ? '' : adminId

      // Build payload with explicit values — include only keys we intend to update
      const updatedMinistry: any = {
        name: name.trim(),
        passcode: passcode.trim(),
      }

      // description: allow clearing by sending null when empty
      updatedMinistry.description = description?.trim() ? description.trim() : null

      // adminId: if empty string or placeholder -> clear admin
      updatedMinistry.adminId = cleanAdminId && cleanAdminId.trim() ? cleanAdminId.trim() : null


      // Call update with clean payload
      await blink.db.ministries.update(editingMinistry.id, updatedMinistry)

      // If previous admin changed, clear their ministry association and role
      if (editingMinistry.adminId && editingMinistry.adminId !== adminId) {
        try {
          await blink.db.users.update(editingMinistry.adminId, {
            role: 'user',
            ministryId: null
          })
        } catch (err) {
          console.error('Failed to revert previous admin role:', err)
        }
      }

      // Assign new admin if set
      if (adminId !== '__none' && adminId.trim()) {
        // Find the user to check their current role
        const userToPromote = users.find(u => u.id === adminId);
        // Only update role if not already a main_admin
        const role = userToPromote?.role === 'main_admin' ? 'main_admin' : 'sub_admin';
        
        await blink.db.users.update(adminId, {
          role: role,
          ministryId: editingMinistry.id,
          status: 'approved'
        })
      }

      setMinistries(ministries.map(ministry => 
        ministry.id === editingMinistry.id 
          ? { ...ministry, ...updatedMinistry }
          : ministry
      ))
      setShowAddModal(false)
      setEditingMinistry(null)
      resetForm()
      loadUsers() // Reload to reflect role changes
      notifications.showSuccess('Ministry updated', 'Changes saved')
    } catch (err: any) {
      console.error('Failed to update ministry:', err)
      // Show clearer error to user when available
      const message = err?.message || (err?.body && JSON.stringify(err.body)) || 'Unable to update ministry'
      notifications.showError('Update failed', message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMinistry = async (ministryId: string) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this ministry? This will affect all associated users.' })
    if (!ok) return

    // Mark deleting state for this ministry item
    setDeletingIds(prev => [...prev, ministryId])
    setLoading(true)
    try {
      // Reset users' roles and ministry association
      const ministryUsers = users.filter(user => user.ministryId === ministryId)
      for (const user of ministryUsers) {
        await blink.db.users.update(user.id, {
          role: 'user',
          ministryId: null,
          status: 'pending'
        })
      }

      // Delete related data
      const songs = await blink.db.songs.list({ where: { ministryId } })
      for (const song of songs) {
        await blink.db.songs.delete((song as any).id)
      }

      const playlists = await blink.db.playlists.list({ where: { ministryId } })
      for (const playlist of playlists) {
        await blink.db.playlists.delete((playlist as any).id)
      }

      await blink.db.ministries.delete(ministryId)
      
      setMinistries(ministries.filter(ministry => ministry.id !== ministryId))
      notifications?.showSuccess('Ministry deleted', 'Ministry and related data were removed')
      loadUsers() // Reload to reflect changes
    } catch (err) {
      console.error('Failed to delete ministry:', err)
      notifications?.showError('Delete failed', 'Unable to delete ministry')
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== ministryId))
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setPasscode('')
    setAdminId('__none')
  }

  const openEditModal = (ministry: Ministry) => {
    setEditingMinistry(ministry)
    setShowAddModal(true)
    setName(ministry.name)
    setDescription(ministry.description || '')
    setPasscode(ministry.passcode)
    setAdminId(ministry.adminId || '__none')
  }

  const getMinistryMembers = (ministryId: string) => {
    return users.filter(u => u.ministryId === ministryId && u.status === 'approved')
  }

  const getMinistryMemberCount = (ministryId: string) => {
    return getMinistryMembers(ministryId).length
  }

  const toggleMinistryExpansion = async (ministryId: string) => {
    if (expandedMinistryId === ministryId) {
      setExpandedMinistryId(null)
    } else {
      setExpandedMinistryId(ministryId)
      
      if (!ministryUsers[ministryId]) {
        try {
          const users = await blink.db.users.list({
            where: { 
              ministryId: ministryId,
              status: 'approved'
            },
            orderBy: { name: 'asc' }
          })
          
          setMinistryUsers(prev => ({
            ...prev,
            [ministryId]: users as User[]
          }))
        } catch (error) {
          console.error('Failed to fetch ministry users:', error)
        }
      }
    }
  }

  const getMinistryAdmin = (ministry: Ministry) => {
    if (!ministry.adminId) return null
    return users.find(user => user.id === ministry.adminId)
  }

  const availableAdmins = users.filter(user => 
    user.role !== 'main_admin' && 
    user.status === 'approved' &&
    (!editingMinistry || user.id === editingMinistry.adminId || user.role !== 'sub_admin')
  )

  const getMinistryProfileColor = (ministryName: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500'
    ]
    const index = ministryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const getMinistryInitials = (ministryName: string) => {
    return ministryName
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('')
  }

  if (loading && ministries.length === 0) {
    return (
      <PageSkeleton 
        withHeader={true}
        withSearch={true}
        withFilters={false}
        contentSkeleton={() => (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg bg-card">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="flex justify-between pt-2">
                    <div className="h-8 w-24 bg-muted rounded"></div>
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      />
    )
  }

  // Ministry Profile View
  if (selectedMinistry) {
    const ministryUsers = users.filter(user => 
      user.ministryId === selectedMinistry.id && user.status === 'approved'
    )
    
    return (
      <div className="h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost" 
              onClick={() => setSelectedMinistry(null)}
              className="text-primary hover:text-primary/80 text-sm mb-2 p-0 h-auto"
            >
              ← Back to Ministries
            </Button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white ${getMinistryProfileColor(selectedMinistry.name)}`}>
              {getMinistryInitials(selectedMinistry.name)}
            </div> 
            <div>
              <h2 className="text-2xl font-bold text-foreground">{selectedMinistry.name}</h2>
              {selectedMinistry.description && (
                <p className="text-muted-foreground">{selectedMinistry.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {ministryUsers.length} members
              </p>
            </div>
          </div>
        </div>
        
        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          {ministryUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Members Yet</h3>
              <p className="text-muted-foreground">Members will appear here once they join</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {ministryUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-white ${user.profilePhoto ? '' : getMinistryProfileColor(user.name)}`}>
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{user.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {user.role === 'sub_admin' && (
                        <><Shield className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-400">Admin</span></>
                      )}
                      {user.role === 'user' && (
                        <><UserIcon className="h-3 w-3" />
                        <span>Member</span></>
                      )}
                      {user.customTag && (
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: user.tagColor || '#666', color: 'white' }}
                        >
                          {user.customTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Ministry Management</h2>
        {userRole === 'main_admin' && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {/* Ministries Grid */}
      <div className="flex-1 overflow-y-auto">
        {ministries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Ministries Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first ministry to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ministries.map((ministry) => {
              const admin = getMinistryAdmin(ministry)
              const memberCount = getMinistryMemberCount(ministry.id)
              
              return (
                <div key={ministry.id} className="relative">
                  <Card 
                    className={`overflow-visible hover:shadow-md transition-all duration-200 ${
                      expandedMinistryId === ministry.id ? 'rounded-b-none' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div 
                        className="flex flex-col space-y-3 cursor-pointer"
                        onClick={() => toggleMinistryExpansion(ministry.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Ministry Profile Circle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMinistry(ministry);
                            }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white hover:opacity-90 transition-opacity flex-shrink-0 mt-0.5 ${getMinistryProfileColor(ministry.name)}`}
                            aria-label={`View ${ministry.name} details`}
                          >
                            {getMinistryInitials(ministry.name)}
                          </button> 
                          
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-foreground text-base flex items-center gap-1.5 min-w-0">
                                <Home className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate max-w-[180px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[350px] xl:max-w-[400px] 2xl:max-w-[500px]">
                                  {ministry.name}
                                </span>
                              </h3>
                              
                              <div className="flex-shrink-0 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-md p-0.5">
                                {userRole === 'main_admin' ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(ministry);
                                      }}
                                      className="p-1.5 h-auto w-auto text-white/90 hover:text-white hover:bg-primary/20 rounded"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMinistry(ministry.id);
                                      }}
                                      disabled={loading || deletingIds.includes(ministry.id)}
                                      className="p-1.5 h-auto w-auto text-white/90 hover:text-white hover:bg-destructive/20 rounded"
                                    >
                                      {deletingIds.includes(ministry.id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className=" text-sm">
                                      View
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {ministry.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words">
                                {ministry.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {expandedMinistryId !== ministry.id && (
                                <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                                  <Users className="h-3.5 w-3.5" />
                                  <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                                </div>
                              )}
                              
                              {admin && (
                                <div className="hidden xs:flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                                  <span className="truncate max-w-[120px]">{admin.name.split(' ')[0]}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                              <span className="text-xs">Code:</span>
                              <code className="font-mono text-xs font-medium bg-background/50 px-1.5 py-0.5 rounded">
                                {ministry.passcode}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedMinistryId === ministry.id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <h4 className="text-sm font-medium text-foreground mb-2">
                            Members ({ministryUsers[ministry.id]?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {ministryUsers[ministry.id] ? (
                              ministryUsers[ministry.id].length > 0 ? (
                                ministryUsers[ministry.id].map((user) => (
                                  <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                                    <div className="relative">
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                        {user.profilePhoto ? (
                                          <img 
                                            src={user.profilePhoto} 
                                            alt={user.name} 
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground truncate">
                                          {user.name}
                                        </p>
                                        {user.role === 'main_admin' ? (
                                          <>
                                        <span
                                          className="inline-flex items-center justify-center text-xs font-semibold px-2 py-1 rounded-full
                                            bg-black text-white border border-black 
                                            shadow-[0_0_2.7px] hover:shadow-[0_0_6px] hover:scale-105 transform 
                                            transition-all duration-200 ease-in-out whitespace-nowrap"
                                          style={{
                                            animation: 'borderNeon 3s linear infinite',
                                            borderColor: 'white',
                                            // Keep text always white, no text shadow animation
                                            textShadow: '0 0 2pxrgb(163, 9, 9) 0, 0)'
                                          }}
                                        >
                                        Main | NXGN.
                                        </span>

                                        <style>
                                        {`
                                          @keyframes borderNeon {
                                            0% { border-color:rgb(24, 255, 255); }
                                            25% { border-color:rgb(73, 211, 144); }
                                            50% { border-color:rgb(255, 252, 103); }
                                            75% { border-color:rgb(191, 255, 0); }
                                            100% { border-color:rgb(0, 247, 255); }
                                          }
                                        `}
                                        </style>

                                        </>


                                        ) : user.role === 'admin' ? (
                                          <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                                            Admin
                                          </span>
                                        ) : user.role === 'sub_admin' ? (
                                          <span className="text-xs font-semibold bg-black text-yellow-500 px-1.5 py-0.5 rounded whitespace-nowrap">
                                            Sub-Admin
                                          </span>
                                        ) : (
                                          <span className="text-xs font-semibold bg-black text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                                            Member
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {user.customTag && (
                                          <span 
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs mr-2"
                                            style={{
                                              backgroundColor: `${user.tagColor || '#8B5CF6'}20`,
                                              color: user.tagColor || '#8B5CF6',
                                              border: `1px solid ${user.tagColor || '#8B5CF6'}40`
                                            }}
                                          >
                                            {user.customTag}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  No members found
                                </p>
                              )
                            ) : (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || !!editingMinistry} onOpenChange={(open) => {
        if (!open) {
          // Only reset the form and close the modal if we're not in the middle of a submit
          if (!loading) {
            setShowAddModal(false)
            setEditingMinistry(null)
            resetForm()
          }
        }
      }}>
        <DialogContent 
          className="w-full max-w-md max-h-[90vh] overflow-y-auto"
          aria-describedby="dialog-description"
        >
          <DialogHeader>
            <DialogTitle>
              {editingMinistry ? 'Edit Ministry' : 'Add New Ministry'}
            </DialogTitle>
            <DialogDescription id="dialog-description">
              {editingMinistry ? 'Update the ministry details below' : 'Enter the details for the new ministry'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingMinistry ? handleEditMinistry : handleAddMinistry} className="space-y-4">
            <div>
              <Label htmlFor="name">Ministry Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of the ministry..."
              />
            </div>

            <div>
              <Label htmlFor="passcode">Ministry Passcode</Label>
              <div className="flex gap-2">
                <Input
                  id="passcode"
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter or generate passcode"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePasscode}
                  className="px-3 text-sm"
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Users will need this passcode to join the ministry
              </p>
            </div>

            <div>
              <Label htmlFor="admin">Assign Admin (Optional)</Label>
              <Select value={adminId} onValueChange={setAdminId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an admin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No admin</SelectItem>
                  {availableAdmins.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingMinistry(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingMinistry ? 'Update Ministry' : 'Create Ministry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}