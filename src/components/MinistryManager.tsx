import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { Home, Plus, Edit, Trash2, Users, Shield, User as UserIcon, Loader2 } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label' 

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

export default function MinistryManager() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

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
        await blink.db.users.update(adminId, {
          role: 'sub_admin',
          ministryId: editingMinistry.id,
          status: 'approved'
        })
      }

      setMinistries(ministries.map(ministry => 
        ministry.id === editingMinistry.id 
          ? { ...ministry, ...updatedMinistry }
          : ministry
      ))
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

  const getMinistryMemberCount = (ministryId: string) => {
    return users.filter(user => user.ministryId === ministryId && user.status === 'approved').length
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
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading ministries...</div>
      </div>
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
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
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
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {ministries.map((ministry) => {
              const admin = getMinistryAdmin(ministry)
              const memberCount = getMinistryMemberCount(ministry.id)
              
              return (
                <div
                  key={ministry.id}
                  className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center gap-3">
                      {/* Ministry Profile Circle */}
                      <button
                        onClick={() => setSelectedMinistry(ministry)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white hover:opacity-90 transition-opacity flex-shrink-0 ${getMinistryProfileColor(ministry.name)}`}
                      >
                        {getMinistryInitials(ministry.name)}
                      </button> 
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          <span className="truncate">{ministry.name}</span>
                        </h3>
                        
                        {ministry.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ministry.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(ministry)}
                          className="p-2 h-auto w-auto text-muted-foreground hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMinistry(ministry.id)}
                          disabled={loading || deletingIds.includes(ministry.id)}
                          className="p-2 h-auto w-auto text-muted-foreground hover:text-destructive"
                        >
                          {deletingIds.includes(ministry.id) ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{memberCount} members</span>
                        </div>
                        
                        {admin && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span className="truncate">Admin: {admin.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <span>Passcode: </span>
                        <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{ministry.passcode}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || !!editingMinistry} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false)
          setEditingMinistry(null)
          resetForm()
        }
      }}>
        <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMinistry ? 'Edit Ministry' : 'Add New Ministry'}
            </DialogTitle>
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