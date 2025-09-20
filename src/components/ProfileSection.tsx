import { useState, useRef } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { Camera, Save, Edit, Tag, X } from 'lucide-react'
import { resizeImage } from '../lib/imageUtils'
import { useNotifications } from '../hooks/useNotifications'

interface ProfileSectionProps {
  user: User
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

export default function ProfileSection({ user, onUserUpdate }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [customTag, setCustomTag] = useState(user.customTag || '')
  const [tagColor, setTagColor] = useState(user.tagColor || '#8B5CF6')
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto)
  const [loading, setLoading] = useState(false)
  const [availability, setAvailability] = useState((user as any).availability ?? 'available')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const notifications = useNotifications()

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const resized = await resizeImage(file, 1024)
      const { publicUrl } = await blink.storage.upload(
        resized,
        `profiles/${user.id}-${Date.now()}.${file.name.split('.').pop()}`,
        { upsert: true }
      )

      setProfilePhoto(publicUrl)
    } catch (err) {
      console.error('Failed to upload photo:', err)
      notifications.showError('Upload failed', 'Failed to upload photo. Please try again.')
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

      // Fetch existing user record to determine which fields actually exist in DB (returned as camelCase)
      const existing = await blink.db.users.list({ where: { id: user.id }, limit: 1 })
      const existingKeys = existing && existing.length > 0 ? Object.keys(existing[0] as any) : []

      // Build a safe payload including only keys present in the existing record
      const safePayload: any = {}
      for (const key of Object.keys(intendedPayload)) {
        if (existingKeys.includes(key)) {
          safePayload[key] = intendedPayload[key]
        }
      }

      // If nothing matched (very rare), fall back to updating only the name
      if (Object.keys(safePayload).length === 0) {
        safePayload.name = intendedPayload.name
      }

      // Perform the update
      await blink.db.users.update(user.id, safePayload)

      // Update local copy and persist to localStorage
      const updatedUser = {
        ...user,
        ...safePayload
      }

      localStorage.setItem('nxgn_user', JSON.stringify(updatedUser))

      // Notify parent component of the update
      if (onUserUpdate) {
        onUserUpdate(updatedUser)
      }

      setIsEditing(false)
      notifications.showSuccess('Profile updated', 'Your profile was saved')
    } catch (err: any) {
      // Log detailed error info for debugging
      console.error('Failed to update profile:', err)
      try { if (err?.raw) console.error('Raw response:', JSON.stringify(err.raw)) } catch(e) { console.error('Stringify error:', e) }
      if (err?.message) console.error('Error message:', err.message)
      if (err?.status) console.error('Status:', err.status)

      notifications.showError('Update failed', err?.message || String(err))
    } finally {
      setLoading(false)
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
    <div className="h-full overflow-y-auto bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">My Profile</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Profile Photo */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-medium overflow-hidden">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-muted border-2 border-background rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">Click camera to change</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              required
            />
          </div>

          {/* Custom Tag */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Custom Tag</label>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="e.g., Worship Leader, Pianist"
              className="w-full p-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              maxLength={30}
            />
          </div>

          {/* Tag Color */}
          {customTag && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tag Color</label>
              <div className="flex flex-wrap gap-1.5">
                {tagColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      tagColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              {/* Preview */}
              <div className="mt-2 p-2 bg-background rounded-md border border-border">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{name}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: `${tagColor}20`, 
                      color: tagColor,
                      border: `1px solid ${tagColor}40`
                    }}
                  >
                    {customTag}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setName(user.name)
                setCustomTag(user.customTag || '')
                setTagColor(user.tagColor || '#8B5CF6')
                setProfilePhoto(user.profilePhoto)
              }}
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <X className="h-3 w-3 mr-1 inline" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="h-3 w-3" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Profile Display */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-lg font-medium overflow-hidden">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-semibold text-foreground">{user.name}</h4>
                {user.customTag && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1"
                    style={{ 
                      backgroundColor: `${user.tagColor}20`, 
                      color: user.tagColor,
                      border: `1px solid ${user.tagColor}40`
                    }}
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {user.customTag}
                  </span>
                )}
              </div>
              <p className={`inline-block px-2 py-0.5 rounded-full text-xs border ${getRoleColor()}`}>
                {getRoleLabel()}
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span 
                className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                  user.status === 'approved' 
                    ? 'bg-green-500/20 text-green-400' 
                    : user.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                {user.status}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Passcode:</span>
              <code className="ml-1 bg-muted px-1 py-0.5 rounded font-mono text-xs">{user.pincode}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}