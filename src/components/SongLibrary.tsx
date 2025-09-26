import { useState, useEffect, useCallback, useRef } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { Search, Filter, Plus, Music, Pencil, Trash, RefreshCw, Loader2 } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'

import { PageSkeleton, ListSkeleton } from '../components/ui/loading-skeleton'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setCardMode = (songId: string, mode: 'both' | 'lyrics' | 'chords') => {
    setCardDisplayModes(prev => ({ ...prev, [songId]: mode }))
  }

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }

  useEffect(() => {
    if (!textareaRef.current) return
    adjustTextareaHeight(textareaRef.current)
  }, [lyrics, chords])

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

      const saved = await blink.db.songs.create(payload as any)
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
      const updatedFields = { title, lyrics, chords, category }
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
    
    setTimeout(() => {
      const lyricsTextarea = document.getElementById('lyrics') as HTMLTextAreaElement
      const chordsTextarea = document.getElementById('chords') as HTMLTextAreaElement
      
      if (lyricsTextarea) {
        lyricsTextarea.style.height = 'auto'
        lyricsTextarea.style.height = `${Math.max(lyricsTextarea.scrollHeight, 300)}px`
      }
      if (chordsTextarea) {
        chordsTextarea.style.height = 'auto'
        chordsTextarea.style.height = `${Math.max(chordsTextarea.scrollHeight, 200)}px`
      }
    }, 10)
  }

  if (loading && songs.length === 0) {
    return (
      <PageSkeleton 
        withHeader={true}
        withSearch={true}
        withFilters={true}
        contentSkeleton={() => <ListSkeleton count={5} />}
      />
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex flex-col space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Song Library</h2>
          {canEdit && (
            <Button 
              onClick={() => setShowAddModal(true)} 
              size="icon"
              className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Add song"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'All' | 'Worship' | 'Praise')}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Worship">Worship</SelectItem>
              <SelectItem value="Praise">Praise</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                {canEdit && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10 bg-background/80 backdrop-blur-sm rounded-md p-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEditModal(song) }}
                      className="p-1.5 h-auto w-auto text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                      aria-label={`Edit ${song.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id) }}
                      className="p-1.5 h-auto w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      aria-label={`Delete ${song.title}`}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start justify-between">
                  <div className="flex-1 min-w-0 pr-6 relative group">
                    <h3 className="font-medium text-foreground mb-1 truncate transition-all">{song.title}</h3>
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
        if (!open) { setShowAddModal(false); setEditingSong(null); resetForm() }
      }}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] max-w-none mx-auto my-2 sm:my-4 rounded-lg p-0 overflow-hidden flex flex-col">
          <div className="p-3 sm:p-4 pt-7 border-b sticky top-0 bg-background z-10">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                {editingSong ? 'Edit Song' : 'Add New Song'}
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <form onSubmit={editingSong ? handleEditSong : handleAddSong} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-3 md:col-span-1">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base py-2 h-auto" required />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={(value) => setCategory(value as 'Worship' | 'Praise')}>
                      <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Worship" className="text-base">Worship</SelectItem>
                        <SelectItem value="Praise" className="text-base">Praise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="lyrics">Lyrics</Label>
                    <div className="relative border rounded-md overflow-hidden">
                      <textarea
                        ref={textareaRef}
                        id="lyrics"
                        value={lyrics}
                        onChange={(e) => { setLyrics(e.target.value); adjustTextareaHeight(e.target) }}
                        placeholder="Enter song lyrics..."
                        className="min-h-[200px] sm:min-h-[300px] w-full p-3 sm:p-4 text-sm sm:text-base font-mono resize-none focus-visible:outline-none border-0 bg-transparent"
                        style={{ minHeight: '200px' }}
                        rows={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chords">Chords</Label>
                    <div className="relative border rounded-md overflow-hidden">
                      <textarea
                        id="chords"
                        value={chords}
                        onChange={(e) => { setChords(e.target.value); adjustTextareaHeight(e.target) }}
                        placeholder="Enter chord progressions..."
                        className="min-h-[150px] sm:min-h-[200px] w-full p-3 sm:p-4 text-sm sm:text-base font-mono resize-none focus-visible:outline-none border-0 bg-transparent"
                        style={{ minHeight: '150px' }}
                        rows={1}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* devAngelo footer */}
            <div className="p-4 border-t flex flex-row justify-end gap-3 bg-background/80 backdrop-blur-sm sticky bottom-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAddModal(false); setEditingSong(null); resetForm() }}
                className="flex-1 sm:flex-none sm:w-auto px-4 sm:px-6 h-11"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 sm:flex-none sm:w-auto px-4 sm:px-6 h-11">
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : editingSong ? 'Update' : 'Add Song'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewingSong} onOpenChange={(open) => !open && setViewingSong(null)}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 flex flex-col rounded-lg">
          {viewingSong && (
            <>
              <div className="p-4 border-b bg-background sticky top-0 z-10">
                <DialogHeader>
                  <DialogTitle className="text-xl">{viewingSong.title}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      viewingSong.category === 'Worship' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {viewingSong.category}
                    </span>
                  </div>
                </DialogHeader>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* View Controls */}
                <div className="flex justify-between items-center flex-wrap gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button 
                      variant={displayMode === 'both' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setDisplayMode('both')}
                      className="text-xs px-2 py-1 h-8"
                    >
                      Both
                    </Button>
                    <Button 
                      variant={displayMode === 'lyrics' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setDisplayMode('lyrics')}
                      className="text-xs px-2 py-1 h-8"
                    >
                      Lyrics
                    </Button>
                    <Button 
                      variant={displayMode === 'chords' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setDisplayMode('chords')}
                      className="text-xs px-2 py-1 h-8"
                    >
                      Chords
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={decreaseFont}
                      className="text-xs px-2 py-1 h-8"
                    >
                      A-
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetFont}
                      className="text-xs px-2 py-1 h-8"
                    >
                      Reset
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={increaseFont}
                      className="text-xs px-2 py-1 h-8"
                    >
                      A+
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="whitespace-pre-wrap font-mono" style={{ fontSize: `${contentFontSize}px` }}>
                  {(displayMode === 'both' || displayMode === 'lyrics') && viewingSong.lyrics && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2">Lyrics</h4>
                      <div>{viewingSong.lyrics}</div>
                    </div>
                  )}
                  
                  {(displayMode === 'both' || displayMode === 'chords') && viewingSong.chords && (
                    <div>
                      <h4 className="font-semibold mb-2">Chords</h4>
                      <div>{viewingSong.chords}</div>
                    </div>
                  )}
                  
                  {!viewingSong.lyrics && !viewingSong.chords && (
                    <p className="text-muted-foreground">No content available</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
