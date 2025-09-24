import { useState, useRef } from 'react'
// File upload will be handled via base64
import { User } from '../App'
import { Camera, LogOut, Tag, Save, Edit, Eye, EyeOff } from 'lucide-react'
import { blink } from '../blink/client'
import { resizeImage } from '../lib/imageUtils'
import { useConfirm } from '../hooks/useConfirm'
import { useNotifications } from '../hooks/useNotifications'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Label } from './ui/label'
import { CardSkeleton } from './ui/loading-skeleton'

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
  const [showPasscode, setShowPasscode] = useState(false)
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
    e.preventDefault();
    if (!name.trim()) {
      notifications.showError('Invalid name', 'Name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      // Build update data with the fields we want to update
      const updateData: {
        name: string;
        profilePhoto: string | null;
        customTag: string | null;
        tagColor: string;
        availability?: string | null;
      } = {
        name: name.trim(),
        profilePhoto: profilePhoto ?? null,
        customTag: customTag.trim() || null,
        tagColor: tagColor ?? '#8B5CF6'
      };
      
      // Only include availability if the user object had it originally
      if (Object.prototype.hasOwnProperty.call(user, 'availability')) {
        updateData.availability = availability ?? null;
      }

      // Use the blink.db API to update the user
      const updatedUser = await blink.db.users.update(user.id, updateData);

      // Notify parent to update app state; fall back to localStorage if not provided
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      } else {
        localStorage.setItem('nxgn_user', JSON.stringify(updatedUser));
      }

      setIsEditing(false);
      notifications.showSuccess('Profile updated', 'Your profile was saved');
    } catch (err: any) {
      // Log detailed error info for debugging
      console.error('Failed to update profile:', err);
      
      // Try to extract error message
      let errorMessage = 'Failed to update profile';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      console.error('Error details:', errorMessage);
      notifications.showError('Update failed', errorMessage);
    } finally {
      setLoading(false);
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
                {loading ? (
                  <div className="h-full p-6">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-32"></div>
                        </div>
                        <div className="h-24 w-24 bg-muted rounded-full"></div>
                      </div>
                      
                      <div className="space-y-6">
                        <CardSkeleton className="h-24" />
                        <CardSkeleton className="h-32" />
                        <CardSkeleton className="h-16" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Passcode:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {showPasscode ? user.pincode : '•'.repeat(6)}
                        </code>
                        <button
                          type="button"
                          onClick={() => setShowPasscode(!showPasscode)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                        >
                          {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="text-foreground">{getRoleLabel()}</span>
                    </div>
                    {user.customTag && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tag:</span>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${user.tagColor || '#8B5CF6'}20`, // 20% opacity of the tag color
                            color: user.tagColor || '#8B5CF6',
                            border: `1px solid ${user.tagColor || '#8B5CF6'}40`
                          }}
                        >
                          {user.customTag}
                        </span>
                      </div>
                    )}
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
                )}
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