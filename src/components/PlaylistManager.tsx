import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { ListMusic, Plus, Music, Edit, Trash2, Search, RefreshCw, Loader2 } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'

interface Playlist {
  id: string
  name: string
  description?: string
  ministryId: string
  createdBy: string
}

interface Song {
  id: string
  title: string
  lyrics?: string
  chords?: string
  category: string
}

interface PlaylistSong {
  id: string
  playlistId: string
  songId: string
  position: number
  song?: Song
  transition?: string
}

interface PlaylistManagerProps {
  user: User
  ministryId?: string
}

export default function PlaylistManager({ user, ministryId }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([])
  const [availableSongs, setAvailableSongs] = useState<Song[]>([])
  const [showAddSongsDialog, setShowAddSongsDialog] = useState(false)
  const [selectedSongsForAdd, setSelectedSongsForAdd] = useState<{songId: string}[]>([])
  const [activeSongTab, setActiveSongTab] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contentFontSize, setContentFontSize] = useState(15)
  const [displayMode, setDisplayMode] = useState<'both' | 'lyrics' | 'chords'>('both')
  // UI states for async actions
  const [addingSongs, setAddingSongs] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  const decreaseFont = () => setContentFontSize(s => Math.max(12, s - 2))
  const increaseFont = () => setContentFontSize(s => Math.min(36, s + 2))
  const resetFont = () => setContentFontSize(15)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const canEdit = user.role === 'main_admin' || user.role === 'sub_admin'
  const notifications = useNotifications()
  const confirm = useConfirm()

  const loadPlaylists = useCallback(async () => {
    if (!ministryId) return

    setLoading(true)
    try {
      const playlistList = await blink.db.playlists.list({
        where: { ministryId: ministryId },
        orderBy: { name: 'asc' }
      })
      setPlaylists(playlistList as Playlist[])
    } catch (err) {
      console.error('Failed to load playlists:', err)
    } finally {
      setLoading(false)
    }
  }, [ministryId])

  const loadSongs = useCallback(async () => {
    if (!ministryId) return

    try {
      const songList = await blink.db.songs.list({
        where: { ministryId: ministryId },
        orderBy: { title: 'asc' }
      })
      setSongs(songList as Song[])
    } catch (err) {
      console.error('Failed to load songs:', err)
    }
  }, [ministryId])

  useEffect(() => {
    loadPlaylists()
    loadSongs()
  }, [loadPlaylists, loadSongs])

  const loadPlaylistSongs = async (playlistId: string) => {
    try {
      const playlistSongLinks = await blink.db.playlistSongs.list({
        where: { playlistId: playlistId },
        orderBy: { position: 'asc' }
      })

      // Map playlist songs with their data
      const playlistSongList = playlistSongLinks.map((link: any) => {
        const song = songs.find(s => s.id === link.songId)
        return {
          ...link,
          song
        }
      }).filter(ps => ps.song) // Only include songs that still exist
      
      setPlaylistSongs(playlistSongList as PlaylistSong[])

      // Ensure first song tab is active immediately after loading
      if (playlistSongList.length > 0) {
        setActiveSongTab(`song-${playlistSongList[0].id}`)
      }

      const usedSongIds = playlistSongLinks.map((link: any) => link.songId)
      setAvailableSongs(songs.filter(song => !usedSongIds.includes(song.id)))
    } catch (err) {
      console.error('Failed to load playlist songs:', err)
    }
  }

  const handleAddPlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !ministryId) return

    setLoading(true)
    try {
      const newPlaylist = {
        id: `playlist-${Date.now()}`,
        name,
        description,
        ministryId,
        createdBy: user.id
      }

      await blink.db.playlists.create(newPlaylist)
      
      setPlaylists([...playlists, newPlaylist as Playlist])
      setShowAddModal(false)
      resetForm()
      notifications.showSuccess('Setlist created', 'Your setlist was saved')
    } catch (err) {
      console.error('Failed to add playlist:', err)
      notifications.showError('Add failed', 'Unable to create playlist')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !editingPlaylist) return

    setLoading(true)
    try {
      const updatedPlaylist = {
        name,
        description
      }

      await blink.db.playlists.update(editingPlaylist.id, updatedPlaylist)
      
      setPlaylists(playlists.map(playlist => 
        playlist.id === editingPlaylist.id 
          ? { ...playlist, ...updatedPlaylist }
          : playlist
      ))
      setEditingPlaylist(null)
      resetForm()
      notifications.showSuccess('Setlist updated', 'Changes saved')
    } catch (err) {
      console.error('Failed to update playlist:', err)
      notifications.showError('Update failed', 'Unable to update playlist')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    const ok = await confirm({ message: 'Are you sure you want to delete this playlist?' })
    if (!ok) return

    // Mark deleting state for this playlist
    setDeletingIds(prev => [...prev, playlistId])
    setLoading(true)
    try {
      // Delete playlist songs first
      const playlistSongLinks = await blink.db.playlistSongs.list({
        where: { playlistId: playlistId }
      })

      for (const link of playlistSongLinks) {
        await blink.db.playlistSongs.delete((link as any).id)
      }

      // Then delete playlist
      await blink.db.playlists.delete(playlistId)
      
      setPlaylists(playlists.filter(playlist => playlist.id !== playlistId))
      notifications?.showSuccess('Setlist deleted', 'Setlist removed successfully')
      
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null)
        setPlaylistSongs([])
      }
    } catch (err) {
      console.error('Failed to delete playlist:', err)
      notifications?.showError('Delete failed', 'Unable to delete playlist')
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== playlistId))
      setLoading(false)
    }
  }

  // Clear all songs from the currently selected setlist
  const clearSetlist = async () => {
    if (!selectedPlaylist) return
    const ok = await confirm({ message: 'Are you sure you want to clear all songs from this setlist?' })
    if (!ok) return

    setResetting(true)
    try {
      for (const ps of playlistSongs) {
        await blink.db.playlistSongs.delete(ps.id)
      }

      // Reload empty playlist
      loadPlaylistSongs(selectedPlaylist.id)
      notifications.showSuccess('Setlist cleared', 'All songs removed from setlist')

      // Close dialog and clear selections if open
      setShowAddSongsDialog(false)
      setSelectedSongsForAdd([])
    } catch (err) {
      console.error('Failed to clear setlist:', err)
      notifications.showError('Clear failed', 'Unable to clear setlist')
    } finally {
      setResetting(false)
    }
  }

  const handleAddSelectedSongsToPlaylist = async () => {
    if (!selectedPlaylist || selectedSongsForAdd.length === 0) return

    setAddingSongs(true)
    try {
      const startPosition = playlistSongs.length
      
      for (let i = 0; i < selectedSongsForAdd.length; i++) {
        const { songId } = selectedSongsForAdd[i]
        await blink.db.playlistSongs.create({
          id: `playlist-song-${Date.now()}-${i}`,
          playlistId: selectedPlaylist.id,
          songId: songId,
          position: startPosition + i
        })
      }

      loadPlaylistSongs(selectedPlaylist.id)
      setShowAddSongsDialog(false)
      setSelectedSongsForAdd([])
      notifications.showSuccess('Songs added', `Added ${selectedSongsForAdd.length} songs to setlist`) 
    } catch (err) {
      console.error('Failed to add songs to playlist:', err)
      notifications.showError('Add failed', 'Unable to add songs')
    } finally {
      setAddingSongs(false)
    }
  }

  const handleRemoveSongFromPlaylist = async (playlistSongId: string) => {
    try {
      await blink.db.playlistSongs.delete(playlistSongId)
      loadPlaylistSongs(selectedPlaylist!.id)
      notifications.showSuccess('Song removed', 'Song removed from setlist')
    } catch (err) {
      console.error('Failed to remove song from playlist:', err)
      notifications.showError('Remove failed', 'Unable to remove song')
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
  }

  const openEditModal = (playlist: Playlist) => {
    setEditingPlaylist(playlist)
    setName(playlist.name)
    setDescription(playlist.description || '')
  }

  const selectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist)
    setActiveSongTab(null)
    loadPlaylistSongs(playlist.id)
  }

  const filteredAvailableSongs = availableSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && playlists.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading setlists...</div>
      </div>
    )
  }

  if (selectedPlaylist) {
    const handleToggleSongSelection = (songId: string) => {
      setSelectedSongsForAdd(prev => {
        const exists = prev.find(s => s.songId === songId)
        if (exists) {
          return prev.filter(s => s.songId !== songId)
        } else {
          return [...prev, { songId }]
        }
      })
    }

    const moveSelectedSong = (fromIndex: number, toIndex: number) => {
      setSelectedSongsForAdd(prev => {
        const newArray = [...prev]
        const [moved] = newArray.splice(fromIndex, 1)
        newArray.splice(toIndex, 0, moved)
        return newArray
      })
    }

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="text-primary hover:text-primary/80 text-sm mb-2"
            >
              ← Back to Setlists
            </button>
            <h2 className="text-xl font-semibold text-foreground">{selectedPlaylist.name}</h2>
            {selectedPlaylist.description && (
              <p className="text-muted-foreground text-sm">{selectedPlaylist.description}</p>
            )}

            <div className="mt-2 flex gap-2 flex-nowrap overflow-x-auto">
              {(['both','lyrics','chords'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDisplayMode(m)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${displayMode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground hover:bg-muted'}`}
                >
                  {m === 'both' ? 'Both' : m === 'lyrics' ? 'Lyrics' : 'Chords'}
                </button>
              ))}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddSongsDialog(true)}
                  className="bg-primary text-primary-foreground px-2 py-1 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  {playlistSongs.length > 0 ? 'Edit' : 'Add Songs'}
                </button>
                {playlistSongs.length > 0 && (
                  <button
                    onClick={clearSetlist}
                    disabled={resetting}
                    className="bg-destructive/10 text-destructive px-2 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    {resetting ? 'Resetting...' : 'Reset'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {playlistSongs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Songs Yet</h3>
            <p className="text-muted-foreground mb-4">Add songs to start building your playlist</p>
            {canEdit && (
              <button
                onClick={() => setShowAddSongsDialog(true)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
              >
                Add First Song
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Song Navigation Tabs */}
            <div className="border-b border-border bg-card">
              <div className="flex overflow-x-auto gap-1 p-2">
                {playlistSongs.map((playlistSong, index) => {
                  const songId = `song-${playlistSong.id}`
                  const isActive = activeSongTab === songId
                  
                  return (
                    <button
                      key={playlistSong.id}
                      onClick={() => {
                        setActiveSongTab(songId)
                        document.getElementById(songId)?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'start'
                        })
                      }}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[120px] ${
                        isActive 
                          ? 'bg-muted/50 text-foreground' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="mr-2 text-xs opacity-75">{index + 1}</span>
                      <span className="truncate">{playlistSong.song?.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scrollable Song Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-0">
                {playlistSongs.map((playlistSong, index) => {
                  const songId = `song-${playlistSong.id}`
                  
                  // Auto-update active tab when scrolling to this song
                  const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        setActiveSongTab(songId)
                      }
                    })
                  }, { threshold: 0.5 })
                  
                  return (
                    <div key={`song-${playlistSong.id}`} 
                      id={songId} 
                      className="border-b border-border last:border-b-0"
                      ref={(el) => {
                        if (el) observer.observe(el)
                      }}
                    >
                      {/* Song Header */}
                      <div className="p-4 bg-card sticky top-0 z-10 border-b border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-primary w-8">{index + 1}</span>
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">{playlistSong.song?.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  playlistSong.song?.category === 'Worship' 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {playlistSong.song?.category}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-card p-1 rounded">
                              <button type="button" onClick={decreaseFont} className="px-2 py-1 text-sm bg-muted rounded">A-</button>
                              <button type="button" onClick={increaseFont} className="px-2 py-1 text-sm bg-muted rounded">A+</button>
                              <button type="button" onClick={resetFont} className="px-2 py-1 text-sm bg-muted rounded"><RefreshCw className="h-4 w-4" /></button>
                            </div>

                            {canEdit && (
                              <button
                                onClick={() => handleRemoveSongFromPlaylist(playlistSong.id)}
                                className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                                disabled={deletingIds.includes(playlistSong.id)}
                              >
                                {deletingIds.includes(playlistSong.id) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Song Content */}
                      <div className="px-6 py-6 bg-background/50 min-h-[300px]">
                        {(displayMode === 'both' || displayMode === 'lyrics') && playlistSong.song?.lyrics && (
                          <div className="mb-6">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Music className="h-4 w-4" />
                              Lyrics
                            </h4>
                            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                              <div className="text-foreground whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${contentFontSize}px` }}>
                                {playlistSong.song.lyrics}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(displayMode === 'both' || displayMode === 'chords') && playlistSong.song?.chords && (
                          <div className="mb-6">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Music className="h-4 w-4" />
                              Chords
                            </h4>
                            <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                              <div className="text-foreground whitespace-pre-wrap font-mono leading-relaxed" style={{ fontSize: `${contentFontSize}px` }}>
                                {playlistSong.song.chords}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {((displayMode === 'both' && !playlistSong.song?.lyrics && !playlistSong.song?.chords) || 
                          (displayMode === 'lyrics' && !playlistSong.song?.lyrics) || 
                          (displayMode === 'chords' && !playlistSong.song?.chords)) && (
                          <div className="text-center text-muted-foreground py-8">
                            <Music className="h-8 w-8 mx-auto mb-3" />
                            <p className="text-sm">
                              {displayMode === 'lyrics' ? 'No lyrics available' : 
                               displayMode === 'chords' ? 'No chords available' : 
                               'No lyrics or chords available for this song'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
        
        {/* Add Songs Dialog */}
        {showAddSongsDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowAddSongsDialog(false); setSelectedSongsForAdd([]); }}>
            <div className="bg-card rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  {playlistSongs.length > 0 ? 'Edit Setlist Songs' : 'Add Songs to Setlist'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {playlistSongs.length > 0 
                    ? 'Add new songs or remove existing ones from your setlist' 
                    : 'Select multiple songs and arrange their order'}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {/* Current Setlist Songs (Edit Mode) */}
                {playlistSongs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-foreground mb-3">Current Setlist ({playlistSongs.length} songs)</h4>
                    <p className="text-sm text-muted-foreground mb-4">Click to remove songs from setlist</p>
                    <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
                      {playlistSongs.map((playlistSong, index) => (
                        <div
                          key={playlistSong.id}
                          onClick={() => deletingIds.includes(playlistSong.id) ? undefined : handleRemoveSongFromPlaylist(playlistSong.id)}
                          className="relative p-4 border-2 border-destructive/20 bg-destructive/5 rounded-xl transition-all cursor-pointer transform hover:scale-[1.02] hover:border-destructive/40 hover:bg-destructive/10"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">{playlistSong.song?.title}</h5>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  playlistSong.song?.category === 'Worship' 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {playlistSong.song?.category}
                                </span>
                              </div>
                            </div>
                            
                            <div className="ml-3 flex-shrink-0">
                              <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center">
                                {deletingIds.includes(playlistSong.id) ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Available Songs */}
                <div className="mb-6">
                  <h4 className="font-medium text-foreground mb-3">Available Songs</h4>
                  <p className="text-sm text-muted-foreground mb-4">Click on song cards to select multiple songs</p>
                  {availableSongs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Music className="h-8 w-8 mx-auto mb-2" />
                      <p>No available songs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                      {availableSongs.map((song) => {
                        const isSelected = selectedSongsForAdd.some(s => s.songId === song.id)
                        return (
                          <div
                            key={song.id}
                            onClick={() => handleToggleSongSelection(song.id)}
                            className={`relative p-4 border-2 rounded-xl transition-all cursor-pointer transform hover:scale-[1.02] ${
                              isSelected 
                                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20' 
                                : 'bg-card border-border hover:bg-muted/50 hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-foreground mb-1">{song.title}</h5>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    song.category === 'Worship' 
                                      ? 'bg-blue-500/20 text-blue-400' 
                                      : 'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    {song.category}
                                  </span>
                                </div>
                              </div>
                              
                              {isSelected && (
                                <div className="ml-3 flex-shrink-0">
                                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Selection overlay effect */}
                            <div className={`absolute inset-0 rounded-xl transition-opacity pointer-events-none ${
                              isSelected ? 'bg-primary/5 opacity-100' : 'opacity-0'
                            }`} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                {/* Selected Songs Order */}
                {selectedSongsForAdd.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">
                      Selected Songs Order ({selectedSongsForAdd.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSongsForAdd.map((selectedSong, index) => {
                        const song = availableSongs.find(s => s.id === selectedSong.songId)
                        return (
                          <div
                            key={selectedSong.songId}
                            className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg"
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveSelectedSong(index, Math.max(0, index - 1))}
                                disabled={index === 0}
                                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveSelectedSong(index, Math.min(selectedSongsForAdd.length - 1, index + 1))}
                                disabled={index === selectedSongsForAdd.length - 1}
                                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                ↓
                              </button>
                            </div>
                            
                            <span className="text-sm font-bold text-primary w-6">{index + 1}.</span>
                            
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{song?.title}</p>
                              <p className="text-sm text-muted-foreground">{song?.category}</p>

                            </div>
                            
                            <button
                              onClick={() => handleToggleSongSelection(selectedSong.songId)}
                              className="text-muted-foreground hover:text-destructive p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-border flex justify-end gap-3 items-end">
                {playlistSongs.length > 0 && canEdit && (
                  <button
                    onClick={clearSetlist}
                    disabled={resetting}
                    className="px-4 py-2 text-destructive hover:text-destructive/80 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {resetting ? 'Resetting...' : 'Reset Setlist'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowAddSongsDialog(false)
                    setSelectedSongsForAdd([])
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddSelectedSongsToPlaylist}
                  disabled={selectedSongsForAdd.length === 0 || addingSongs}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {addingSongs ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Setlists</h2>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Setlist
          </button>
        )}
      </div>

      {/* Playlists Grid */}
      <div className="flex-1 overflow-y-auto">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Setlists Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first setlist to organize your songs</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => selectPlaylist(playlist)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground mb-2">{playlist.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ListMusic className="h-3 w-3" />
                      <span>Click to manage songs</span>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(playlist)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted rounded"
                        disabled={deletingIds.includes(playlist.id)}
                      >
                        {deletingIds.includes(playlist.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingPlaylist) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowAddModal(false); setEditingPlaylist(null); resetForm(); }}>
          <div className="bg-card rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {editingPlaylist ? 'Edit Setlist' : 'Create New Setlist'}
            </h3>
            
            <form onSubmit={editingPlaylist ? handleEditPlaylist : handleAddPlaylist} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describe this setlist..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingPlaylist(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingPlaylist ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}