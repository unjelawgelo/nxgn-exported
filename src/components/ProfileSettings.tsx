import { useState, useRef } from 'react'
// File upload will be handled via base64
import { User } from '../App'
import { Camera, LogOut, Tag, Save, Edit } from 'lucide-react'
import { resizeImage } from '../lib/imageUtils'
import { useConfirm } from '../hooks/useConfirm'
import { useNotifications } from '../hooks/useNotifications'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Label } from './ui/label'

interface ProfileSettingsProps {
  user: User
  onLogout: () => void
  onUserUpdate?: (updatedUser: User) => void
}

const tagColors = [
  '#8B5CF6', // Purple (primary)
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5A2B', // Brown
  '#6B7280', // Gray
]

export default function ProfileSettings({ user, onLogout, onUserUpdate }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [customTag, setCustomTag] = useState(user.customTag || '')
  // Standardize to tagColor (maps to DB column `tag_color` via camelCase -> snake_case)
  const [tagColor, setTagColor] = useState(user.tagColor || '#8B5CF6')
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto)
  const [loading, setLoading] = useState(false)
  const [availability, setAvailability] = useState((user as any).availability ?? 'available')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const notifications = useNotifications()

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      notifications.showError('Invalid file type', 'Please upload an image file')
      return
    }

    setLoading(true)
    try {
      // Resize image first
      const resized = await resizeImage(file, 1024)
      
      // Convert to base64
      const reader = new FileReader()
      reader.readAsDataURL(resized)
      
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          setProfilePhoto(reader.result as string)
          resolve(null)
        }
        reader.onerror = (error) => reject(error)
      })
    } catch (err) {
      console.error('Failed to process photo:', err)
      notifications.showError('Upload failed', 'Failed to process photo. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      notifications.showError('Invalid name', 'Name cannot be empty')
      return
    }

    setLoading(true)
    try {
      // Build intended payload (camelCase keys - Blink SDK will convert to snake_case)
      const intendedPayload: any = {
        name: name.trim(),
        profilePhoto: profilePhoto ?? null,
        customTag: customTag.trim() || null,
        tagColor: tagColor ?? '#8B5CF6'
      }
      // Only include availability if the user object had it originally
      if (Object.prototype.hasOwnProperty.call(user, 'availability')) {
        intendedPayload.availability = availability ?? null
      }

      // Since we're not using the backend, we'll use all intended fields
      const safePayload = { ...intendedPayload }

      // For demo purposes, we'll just update the local state
      // In a real app, you would send this to your backend API
      const updatedUser = {
        ...user,
        ...safePayload
      }

      // Notify parent to update app state; fall back to localStorage if not provided
      // This ensures the UI updates with the new profile photo
      if (onUserUpdate) {
        onUserUpdate(updatedUser)
      } else {
        localStorage.setItem('nxgn_user', JSON.stringify(updatedUser))
      }

      setIsEditing(false)
      notifications.showSuccess('Profile updated', 'Your profile was saved')
    } catch (err: any) {
      // Log detailed error info for debugging
      console.error('Failed to update profile:', err)
      try {
        if (err?.raw) console.error('Raw response:', JSON.stringify(err.raw))
      } catch (e) {
        console.error('Stringify error:', e)
      }
      if (err?.message) console.error('Error message:', err.message)
      if (err?.status) console.error('Status:', err.status)

      notifications.showError('Update failed', err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirm({ 
      title: 'Confirm logout',
      message: 'Are you sure you want to logout? You will need to sign in again to access your account.' 
    })
    if (confirmed) {
      onLogout()
    }
  }

  const getRoleLabel = () => {
    switch (user.role) {
      case 'main_admin':
        return 'Main Administrator'
      case 'sub_admin':
        return 'Ministry Administrator'
      default:
        return 'Member'
    }
  }

  const getRoleColor = () => {
    switch (user.role) {
      case 'main_admin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'sub_admin':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Profile Settings</h2>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="flex-1 max-w-2xl overflow-y-auto">
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-medium overflow-hidden">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 p-0 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-2">Click the camera icon to change photo</p>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Custom Tag */}
            <div>
              <Label htmlFor="customTag">Custom Tag (Optional)</Label>
              <Input
                id="customTag"
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="e.g., Worship Leader, Pianist, etc."
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground mt-1">This will appear as a badge next to your name</p>
            </div>

            {/* Tag Color */}
            {customTag && (
              <div>
                <Label>Tag Color</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                    >
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: tagColor }}
                      />
                      Choose Color
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-4 gap-2">
                      {tagColors.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="ghost"
                          onClick={() => setTagColor(color)}
                          className={`w-12 h-12 rounded-full p-0 border-2 ${
                            tagColor === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Card className="mt-3">
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name}</span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${tagColor}20`, 
                          color: tagColor,
                          border: `1px solid ${tagColor}40`
                        }}
                      >
                        {customTag}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setName(user.name)
                  setCustomTag(user.customTag || '')
                  setTagColor(user.tagColor || '#8B5CF6')
                  setProfilePhoto(user.profilePhoto)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Profile Display */}
            {/* <div className="flex items-center gap-4 p-6 bg-card border border-border rounded-lg">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-medium overflow-hidden">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold text-foreground">{user.name}</h3>
                  {user.customTag && (
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                      style={{ 
                        backgroundColor: `${user.tagColor}20`, 
                        color: user.tagColor,
                        border: `1px solid ${user.tagColor}40`
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {user.customTag}
                    </span>
                  )}
                </div>
                <p className={`inline-block px-3 py-1 rounded-full text-sm border ${getRoleColor()}`}>
                  {getRoleLabel()}
                </p>
              </div>
            </div> */}
            {/* Profile Photo */}
<div className="flex flex-col items-center">
  <div className="relative">
    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-medium overflow-hidden">
      {profilePhoto ? (
        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      // Instead of triggering file input, show disabled notice
      onClick={() =>
        notifications.showError(
          'Feature Disabled',
          'Profile photo upload is currently disabled.'
        )
      }
      className="absolute -bottom-1 -right-1 w-8 h-8 p-0 rounded-full"
    >
      <Camera className="h-4 w-4" />
    </Button>
  </div>
  {/* Hidden input kept but not used */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    disabled
    className="hidden"
  />
  <p className="text-sm text-muted-foreground mt-2">Photo upload is disabled for now</p>
</div>


            {/* Account Info */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-foreground mb-4">Account Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passcode:</span>
                    <code className="bg-muted px-2 py-1 rounded font-mono text-sm">{user.pincode}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="text-foreground">{getRoleLabel()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span 
                      className={`px-2 py-1 rounded text-xs ${
                        user.status === 'approved' 
                          ? 'bg-green-500/20 text-green-400' 
                          : user.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logout Section */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-foreground mb-4">Account Actions</h4>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}