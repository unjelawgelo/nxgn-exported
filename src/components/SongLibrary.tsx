import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { Search, Filter, Plus, Music, Edit, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'

interface Song {
  id: string
  title: string
  lyrics: string
  chords: string
  category: string
  ministryId: string
  createdBy: string
}

interface SongLibraryProps {
  user: User
  ministryId?: string
}

export default function SongLibrary({ user, ministryId }: SongLibraryProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Worship' | 'Praise'>('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [viewingSong, setViewingSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [chords, setChords] = useState('')
  const [category, setCategory] = useState<'Worship' | 'Praise'>('Worship')

  const canEdit = user.role === 'main_admin' || user.role === 'sub_admin'
  const notifications = useNotifications()
  const confirm = useConfirm()
  const [contentFontSize, setContentFontSize] = useState(15)
  const [displayMode, setDisplayMode] = useState<'both' | 'lyrics' | 'chords'>('both')
  const [cardDisplayModes, setCardDisplayModes] = useState<Record<string, 'both' | 'lyrics' | 'chords'>>({})

  const setCardMode = (songId: string, mode: 'both' | 'lyrics' | 'chords') => {
    setCardDisplayModes(prev => ({ ...prev, [songId]: mode }))
  }

  const decreaseFont = () => setContentFontSize(s => Math.max(12, s - 2))
  const increaseFont = () => setContentFontSize(s => Math.min(36, s + 2))
  const resetFont = () => setContentFontSize(15)

  const loadSongs = useCallback(async () => {
    if (!ministryId) return

    setLoading(true)
    try {
      const songList = await blink.db.songs.list({
        where: { ministryId: ministryId },
        orderBy: { title: 'asc' }
      })
      setSongs(songList as Song[])
    } catch (err) {
      console.error('Failed to load songs:', err)
    } finally {
      setLoading(false)
    }
  }, [ministryId])

  useEffect(() => {
    loadSongs()
  }, [loadSongs])

  useEffect(() => {
    let filtered = songs

    if (searchQuery) {
      filtered = filtered.filter(song => 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.lyrics.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter(song => song.category === categoryFilter)
    }

    setFilteredSongs(filtered)
  }, [songs, searchQuery, categoryFilter])



  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !ministryId) return

    setLoading(true)
    try {
      const payload = {
        title,
        lyrics,
        chords,
        category,
        ministryId,
        createdBy: user.id
      }

      // Persist to DB and use the returned record to keep local state authoritative
      const saved = await blink.db.songs.create(payload as any)

      // Use the saved record returned from the DB (it should include id and timestamps)
      setSongs(prev => [...prev, saved as Song])
      setShowAddModal(false)
      resetForm()
      notifications.showSuccess('Song added', 'Your song was saved')
    } catch (err) {
      console.error('Failed to add song:', err)
      notifications.showError('Add failed', 'Unable to add song')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSong = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !editingSong) return

    setLoading(true)
    try {
      const updatedFields = {
        title,
        lyrics,
        chords,
        category
      }

      // Persist updates and use returned record
      const saved = await blink.db.songs.update(editingSong.id, updatedFields as any)

      setSongs(prev => prev.map(song => 
        song.id === editingSong.id 
          ? { ...song, ...(saved as Partial<Song>) }
          : song
      ))
      setEditingSong(null)
      resetForm()
      notifications.showSuccess('Song updated', 'Changes saved')
    } catch (err) {
      console.error('Failed to update song:', err)
      notifications.showError('Update failed', 'Unable to update song')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSong = async (songId: string) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this song?' })
    if (!ok) return

    setDeletingIds(prev => [...prev, songId])
    setLoading(true)
    try {
      await blink.db.songs.delete(songId)
      setSongs(songs.filter(song => song.id !== songId))
      notifications?.showSuccess('Song deleted', 'The song was removed successfully')
    } catch (err) {
      console.error('Failed to delete song:', err)
      notifications?.showError('Delete failed', 'Unable to delete song')
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== songId))
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setLyrics('')
    setChords('')
    setCategory('Worship')
  }

  const openEditModal = (song: Song) => {
    setEditingSong(song)
    setTitle(song.title)
    setLyrics(song.lyrics || '')
    setChords(song.chords || '')
    setCategory(song.category as 'Worship' | 'Praise')
  }

  if (loading && songs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading songs...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Song Library</h2>
        {canEdit && (
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Song
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'All' | 'Worship' | 'Praise')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="Worship">Worship</SelectItem>
            <SelectItem value="Praise">Praise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Songs Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'All' 
                ? 'No songs match your search criteria' 
                : 'Get started by adding your first song'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className="song-card bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden mx-2 my-2"
                onClick={() => { setViewingSong(song); setDisplayMode(cardDisplayModes[song.id] || 'both') }}
              >
                {/* Edit/Delete buttons - top right inside card */}
                {canEdit && (
                  <div className="absolute top-2 right-2 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(song)}
                      className="p-2 h-auto w-auto text-muted-foreground hover:text-primary"
                      aria-label={`Edit ${song.title}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSong(song.id)}
                      className="p-2 h-auto w-auto text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${song.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start justify-between">
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-medium text-foreground mb-1 truncate">{song.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        song.category === 'Worship' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {song.category}
                      </span>
                    </div>

                    {(() => {
                      const text = song.lyrics || song.chords || ''
                      if (!text) return null
                      const preview = text.slice(0, 30)
                      return (
                        <div className="text-sm text-muted-foreground">
                          {preview}{text.length > 30 ? '...' : ''}
                        </div>
                      )
                    })() }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal || !!editingSong} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false)
          setEditingSong(null)
          resetForm()
        }
      }}>
        <DialogContent className="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSong ? 'Edit Song' : 'Add New Song'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={editingSong ? handleEditSong : handleAddSong} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as 'Worship' | 'Praise')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Worship">Worship</SelectItem>
                  <SelectItem value="Praise">Praise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lyrics">Lyrics</Label>
              <Textarea
                id="lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={6}
                placeholder="Enter song lyrics..."
              />
            </div>

            <div>
              <Label htmlFor="chords">Chords</Label>
              <Textarea
                id="chords"
                value={chords}
                onChange={(e) => setChords(e.target.value)}
                rows={4}
                placeholder="Enter chord progressions..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingSong(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingSong ? 'Update Song' : 'Add Song'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingSong} onOpenChange={(open) => !open && setViewingSong(null)}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{viewingSong?.title}</DialogTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-card p-1 rounded">
                  <Button variant="outline" size="sm" onClick={decreaseFont} className="px-2 py-1 h-auto">A-</Button>
                  <Button variant="outline" size="sm" onClick={increaseFont} className="px-2 py-1 h-auto">A+</Button>
                  <Button variant="outline" size="sm" onClick={resetFont} className="px-2 py-1 h-auto"><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          {viewingSong && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded text-sm ${
                  viewingSong.category === 'Worship' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {viewingSong.category}
                </span>

                <div className="flex flex-wrap gap-2 ml-auto">
                  {(['both','lyrics','chords'] as const).map((m) => (
                    <Button
                      key={m}
                      variant={displayMode === m ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayMode(m)}
                      className="text-sm"
                    >
                      {m === 'both' ? 'Both' : m === 'lyrics' ? 'Lyrics' : 'Chords'}
                    </Button>
                  ))}
                </div>
              </div>

              {(displayMode === 'both' || displayMode === 'lyrics') && viewingSong.lyrics && (
                <div className="mb-6">
                  <h4 className="font-medium text-foreground mb-2">Lyrics</h4>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-foreground whitespace-pre-wrap" style={{ fontSize: `${contentFontSize}px` }}>{viewingSong.lyrics}</pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {(displayMode === 'both' || displayMode === 'chords') && viewingSong.chords && (
                <div className="mb-6">
                  <h4 className="font-medium text-foreground mb-2">Chords</h4>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-foreground whitespace-pre-wrap font-mono" style={{ fontSize: `${contentFontSize}px` }}>{viewingSong.chords}</pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}