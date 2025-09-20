import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { CheckCircle, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'

interface AvailabilityManagerProps {
  user: User
  ministryId?: string
}

interface Member {
  id: string
  name: string
  role: string
  profilePhoto?: string
  availability?: 'available' | 'unavailable'
}

export default function AvailabilityManager({ user, ministryId }: AvailabilityManagerProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [userAvailability, setUserAvailability] = useState<'available' | 'unavailable'>('unavailable')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (ministryId) {
      loadMembers()
      loadUserAvailability()
    }
  }, [ministryId, user.id])

  const loadMembers = async () => {
    try {
      setLoading(true)
      
      // Get all members in the ministry
      const membersData = await blink.db.users.list({
        where: { ministryId: ministryId },
        orderBy: { name: 'asc' }
      })

      // Get availability data for all members
      const availabilityData = await blink.db.availability.list({
        where: { ministryId: ministryId }
      })

      // Create availability lookup
      const availabilityMap = availabilityData.reduce((acc: Record<string, string>, item: any) => {
        acc[item.userId] = item.status
        return acc
      }, {})

      // Combine member data with availability
      const membersWithAvailability = membersData.map((member: any) => ({
        ...member,
        availability: availabilityMap[member.id] || 'unavailable'
      }))

      setMembers(membersWithAvailability)
    } catch (error) {
      console.error('Failed to load members:', error)
      toast.error('Failed to load member availability')
    } finally {
      setLoading(false)
    }
  }

  const loadUserAvailability = async () => {
    try {
      const availability = await blink.db.availability.list({
        where: { 
          userId: user.id,
          ministryId: ministryId
        }
      })

      if (availability.length > 0) {
        setUserAvailability(availability[0].status as 'available' | 'unavailable')
      } else {
        setUserAvailability('unavailable')
      }
    } catch (error) {
      console.error('Failed to load user availability:', error)
    }
  }

  const updateUserAvailability = async (newStatus: 'available' | 'unavailable') => {
    try {
      setUpdating(true)
      
      // Check if availability record exists
      const existing = await blink.db.availability.list({
        where: { 
          userId: user.id,
          ministryId: ministryId
        }
      })

      if (existing.length > 0) {
        // Update existing record
        await blink.db.availability.update(existing[0].id, {
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new record
        await blink.db.availability.create({
          id: `avail_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: user.id,
          ministryId: ministryId!,
          status: newStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      setUserAvailability(newStatus)
      toast.success(`Availability updated to ${newStatus}`)
      
      // Reload all members to reflect changes
      loadMembers()
    } catch (error) {
      console.error('Failed to update availability:', error)
      toast.error('Failed to update availability')
    } finally {
      setUpdating(false)
    }
  }

  const availableMembers = members.filter(m => m.availability === 'available')
  const unavailableMembers = members.filter(m => m.availability === 'unavailable')

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Member Availability</h2>
          <p className="text-muted-foreground text-sm">
            View and manage member availability for upcoming services and events.
          </p>
        </div>

        {/* User's Availability Toggle */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">
                  Set your availability status
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant={userAvailability === 'available' ? 'default' : 'secondary'}
                  className={userAvailability === 'available' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {userAvailability === 'available' ? 'Available' : 'Unavailable'}
                </Badge>
                <Switch
                  checked={userAvailability === 'available'}
                  onCheckedChange={(checked) => 
                    updateUserAvailability(checked ? 'available' : 'unavailable')
                  }
                  disabled={updating}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Available Members */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Available ({availableMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No members available
                </p>
              ) : (
                <div className="space-y-3">
                  {availableMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {member.profilePhoto ? (
                          <img 
                            src={member.profilePhoto} 
                            alt={member.name} 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unavailable Members */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                Unavailable ({unavailableMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unavailableMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  All members available!
                </p>
              ) : (
                <div className="space-y-3">
                  {unavailableMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {member.profilePhoto ? (
                          <img 
                            src={member.profilePhoto} 
                            alt={member.name} 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Members List */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No members found in this ministry.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex flex-col items-center p-4 rounded-lg border border-border/50 bg-background/50 space-y-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-medium">
                      {member.profilePhoto ? (
                        <img 
                          src={member.profilePhoto} 
                          alt={member.name} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-sm text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    <Badge 
                      variant={member.availability === 'available' ? 'default' : 'secondary'}
                      className={`text-xs ${member.availability === 'available' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      {member.availability === 'available' ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}