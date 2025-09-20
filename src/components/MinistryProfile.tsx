import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { Users, UserCircle, Crown, Shield } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'

interface MinistryMember {
  id: string
  userId: string
  ministryId: string
  roles: string[]
  roleColors: { [role: string]: string }
  status: 'pending' | 'approved' | 'declined'
  profile?: {
    name: string
    photoUrl?: string
  }
}

interface MinistryProfileProps {
  user: User
  ministryId?: string
}

const MINISTRY_ROLES = [
  'Vocal Lead',
  'Backup Singers', 
  'Lead Guitar',
  'Guitar 2',
  'Acoustic Guitar',
  'Bass Guitar',
  'Drummer',
  'Keyboard/Pianist',
  'Tech Team'
]

const DEFAULT_ROLE_COLORS: { [key: string]: string } = {
  'Vocal Lead': '#8B5CF6',
  'Backup Singers': '#10B981', 
  'Lead Guitar': '#F59E0B',
  'Guitar 2': '#EF4444',
  'Acoustic Guitar': '#84CC16',
  'Bass Guitar': '#06B6D4',
  'Drummer': '#F97316',
  'Keyboard/Pianist': '#EC4899',
  'Tech Team': '#6366F1'
}

export default function MinistryProfile({ user, ministryId }: MinistryProfileProps) {
  const [members, setMembers] = useState<MinistryMember[]>([])
  const [loading, setLoading] = useState(false)
  const notifications = useNotifications()

  const loadMembers = useCallback(async () => {
    if (!ministryId) return

    setLoading(true)
    try {
      // Get ministry members from users table 
      const membersList = await blink.db.users.list({
        where: { 
          ministryId: ministryId,
          status: 'approved' 
        },
        orderBy: { createdAt: 'desc' }
      })

      // Map members with basic profile info
      const membersWithProfiles = membersList.map((member: any) => ({
        id: member.id,
        userId: member.id,
        ministryId: member.ministryId,
        roles: [], // No role system for now
        roleColors: {},
        status: member.status,
        profile: {
          name: member.name,
          photoUrl: member.profilePhoto
        }
      }))

      setMembers(membersWithProfiles as MinistryMember[])
    } catch (err) {
      console.error('Failed to load ministry members:', err)
      notifications.showError('Load failed', 'Unable to load ministry members')
    } finally {
      setLoading(false)
    }
  }, [ministryId, notifications])

  useEffect(() => {
    if (ministryId) {
      loadMembers()
    }
  }, [ministryId, loadMembers])



  const getRoleColor = (member: MinistryMember, role: string) => {
    return member.roleColors[role] || DEFAULT_ROLE_COLORS[role] || '#6B7280'
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Vocal Lead':
        return '🎤'
      case 'Backup Singers':
        return '🎵'
      case 'Lead Guitar':
      case 'Guitar 2':
      case 'Acoustic Guitar':
        return '🎸'
      case 'Bass Guitar':
        return '🎸'
      case 'Drummer':
        return '🥁'
      case 'Keyboard/Pianist':
        return '🎹'
      case 'Tech Team':
        return '🎧'
      default:
        return '🎵'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading members...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ministry Members</h2>
            <p className="text-sm text-muted-foreground">{members.length} active members</p>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="flex-1 overflow-y-auto">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Members Yet</h3>
            <p className="text-muted-foreground">Ministry members will appear here once they join</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-card border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Profile Photo */}
                  <div className="flex-shrink-0">
                    {member.profile?.photoUrl ? (
                      <img
                        src={member.profile.photoUrl}
                        alt={member.profile.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-foreground truncate">
                        {member.profile?.name || 'Unknown User'}
                      </h3>
                      
                      {/* Show admin badges */}
                      {member.userId === user.id && user.role === 'main_admin' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      {member.userId === user.id && user.role === 'sub_admin' && (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                    </div>

                    {/* Ministry Roles */}
                    <div className="space-y-2">
                      {member.roles.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">
                          No ministry roles assigned
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {member.roles.map((role, index) => (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                              style={{ 
                                backgroundColor: getRoleColor(member, role),
                                boxShadow: `0 0 0 1px ${getRoleColor(member, role)}20`
                              }}
                            >
                              <span className="text-xs">{getRoleIcon(role)}</span>
                              <span>{role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Member Status Info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Active Member</span>
                      </div>
                      {member.userId === user.id && (
                        <span className="text-primary font-medium">You</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">💡 Tip:</span> Members can assign their ministry roles in their profile settings. 
          Roles help identify each person's contribution to worship services.
        </p>
      </div>
    </div>
  )
}