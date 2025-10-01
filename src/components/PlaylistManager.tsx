import { useState, useEffect, useCallback } from 'react'
import { blink } from '../blink/client'
import { User } from '../App'
import { playlistDb } from '../lib/dbUtils'
import { ListMusic, Plus, Music, Pencil, Trash, Search, RefreshCw, Loader2, MoreHorizontal } from 'lucide-react'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useNotifications } from '../hooks/useNotifications'
import { useConfirm } from '../hooks/useConfirm'
import { PageSkeleton, ListSkeleton } from './ui/loading-skeleton'

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
  const [songKeys, setSongKeys] = useState<Record<string, string>>({})
  const [showChords, setShowChords] = useState<Record<string, boolean>>({})
  // UI states for async actions
  const [addingSongs, setAddingSongs] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  const decreaseFont = () => setContentFontSize(s => Math.max(12, s - 2))
  const increaseFont = () => setContentFontSize(s => Math.min(36, s + 2))
  const resetFont = () => setContentFontSize(15)

  // Get or set the key for a specific song
  const getSongKey = (songId: string) => {
    return songKeys[songId] || 'C';
  };

  // Update the key for a specific song
  const setSongKey = (songId: string, key: string) => {
    setSongKeys(prev => ({
      ...prev,
      [songId]: key
    }));
  };

  // Toggle between showing chords or numbers for a song
  const toggleShowChords = (songId: string) => {
    setShowChords(prev => ({
      ...prev,
      [songId]: !(prev[songId] ?? false) // Default to false (show Nashville) if not set
    }));
  };

  // Check if we should show chords or numbers for a song
  const shouldShowChords = (songId: string) => {
    return showChords[songId] ?? false; // Default to false (show Nashville) if not set
  };

  // Convert Nashville numbers to chords based on selected key
  const convertNashvilleToChords = (text: string, key: string) => {
    if (!text) return '';
    
    // Define the major scale notes in order
    const majorScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Find the index of the selected key
    const keyIndex = majorScale.indexOf(key);
    if (keyIndex === -1) return text; // If key not found, return original text
    
    // Define the Nashville number to chord quality mapping
    const nashvilleChords = {
      '1': '',    // Major
      '2': 'm',   // Minor
      '3': 'm',   // Minor
      '4': '',    // Major
      '5': '',    // Major (dominant)
      '6': 'm',   // Minor
      '7': 'dim'  // Diminished
    };
    
    // Create a map of Nashville numbers to actual chords in the selected key
    const chordMap: Record<string, string> = {};
    
    // Generate chords for each degree
    Object.entries(nashvilleChords).forEach(([degree, quality]) => {
      const degreeNum = parseInt(degree);
      // Calculate the note index (0-based) - using the major scale formula
      const noteIndex = (keyIndex + [0, 2, 4, 5, 7, 9, 11][degreeNum - 1]) % 12;
      chordMap[degree] = majorScale[noteIndex] + quality;
    });
    
    // Replace Nashville numbers with chords in the text
    let result = text;
    
    // First replace all the numbers at word boundaries
    Object.entries(chordMap).forEach(([number, chord]) => {
      // Match the number at word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${number}\\b`, 'g');
      result = result.replace(regex, chord);
    });
    
    return result;
  }

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
      console.error('Failed to load playlists')
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
      console.error('Failed to load songs')
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
      console.error('Failed to load playlist songs')
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
      
      // Instead of just adding the new playlist locally, refetch the full list
      // to ensure we have the latest data from the server
      const updatedPlaylists = await blink.db.playlists.list({
        where: { ministryId },
        orderBy: { name: 'asc' }
      })
      
      setPlaylists(updatedPlaylists as Playlist[])
      setShowAddModal(false)
      resetForm()
      notifications.showSuccess('Setlist created', 'Your setlist was saved')
      
      // Select the newly created playlist
      const createdPlaylist = updatedPlaylists.find(p => p.name === name)
      if (createdPlaylist) {
        setSelectedPlaylist(createdPlaylist as Playlist)
        loadPlaylistSongs(createdPlaylist.id)
      }
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
      console.error('Failed to update playlist')
      notifications.showError('Update failed', 'Unable to update playlist')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return
    
    const ok = await confirm({ 
      title: 'Delete Setlist',
      message: `Are you sure you want to delete the setlist "${playlist.name}"? This action cannot be undone.`
    })
    
    if (!ok) return

    // Mark deleting state for this playlist
    setDeletingIds(prev => [...prev, playlistId])
    
    try {
      // Delete the playlist (the database should handle cascading deletes for playlist_songs)
      await playlistDb.delete(playlistId)
      
      // Optimistically update the UI
      setPlaylists(prev => prev.filter(p => p.id !== playlistId))
      notifications.showSuccess('Setlist deleted', 'The setlist has been successfully deleted')
      
      // Clear selection if this was the selected playlist
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null)
        setPlaylistSongs([])
      }
    } catch (err) {
      console.error('Failed to delete playlist')
      notifications.showError(
        'Delete failed', 
        'Unable to delete the setlist. Please try again.'
      )
    } finally {
      // Clear the deleting state
      setDeletingIds(prev => prev.filter(id => id !== playlistId))
    }
  }

  // Clear all songs from the currently selected setlist
  const clearSetlist = async () => {
    if (!selectedPlaylist) return
    
    const ok = await confirm({ 
      title: 'Clear Setlist',
      message: 'Are you sure you want to remove all songs from this setlist? This action cannot be undone.'
    })
    
    if (!ok) return

    setResetting(true)
    
    try {
      // Get all songs in the playlist
      const songs = await playlistDb.getSongs(selectedPlaylist.id)
      
      // Remove each song from the playlist
      const removePromises = songs.map(song => 
        playlistDb.removeSong(selectedPlaylist.id, song.id)
          .catch(err => {
            console.error('Failed to remove song:', song.id)
            return null
          })
      )
      
      await Promise.all(removePromises)
      
      // Optimistically update the UI
      setPlaylistSongs([])
      setAvailableSongs(prev => [...songs, ...prev]) // Add all songs back to available
      
      notifications.showSuccess('Setlist cleared', 'All songs have been removed from the setlist')
      
      // Close dialog and clear selections if open
      setShowAddSongsDialog(false)
      setSelectedSongsForAdd([])
    } catch (err) {
      console.error('Failed to clear setlist')
      notifications.showError(
        'Clear failed', 
        'Unable to clear the setlist. Please try again.'
      )
    } finally {
      setResetting(false)
    }
  }

  const handleAddSelectedSongsToPlaylist = async () => {
    if (!selectedPlaylist) {
      notifications.showError('No playlist selected', 'Please select a playlist first')
      return
    }

    // If no songs are selected and no existing songs in playlist, show error
    if (selectedSongsForAdd.length === 0 && playlistSongs.length === 0) {
      notifications.showError('No changes', 'Please add or remove songs from the setlist')
      return
    }

    setAddingSongs(true)
    const addedSongs = []
    const errors = []
    
    try {
      // Since we can't filter playlists by ID, we'll assume the playlist exists
      // if we have a selectedPlaylist object. The server will validate the playlist ID.
      if (!selectedPlaylist?.id) {
        throw new Error('Invalid playlist reference')
      }

      const startPosition = playlistSongs.length
      
      // Process songs in sequence to maintain proper position numbering
      for (let i = 0; i < selectedSongsForAdd.length; i++) {
        const { songId } = selectedSongsForAdd[i]
        try {
          // Skip song existence check since we can't filter by ID
          // The server will validate the song ID
          
          // Add song to playlist
          await blink.db.playlistSongs.create({
            id: `playlist-song-${Date.now()}-${i}`,
            playlistId: selectedPlaylist.id,
            songId: songId,
            position: startPosition + i
          })
          
          addedSongs.push(songId)
        } catch (err) {
          console.error('Failed to add song to playlist')
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          
          // Provide more user-friendly error messages
          let userMessage = errorMessage
          if (errorMessage.includes('foreign key constraint')) {
            if (errorMessage.includes('playlist_id_fkey')) {
              userMessage = 'The playlist no longer exists or is not accessible'
            } else if (errorMessage.includes('song_id_fkey')) {
              userMessage = 'The song no longer exists or is not accessible'
            } else {
              userMessage = 'Invalid playlist or song reference'
            }
          }
          
          errors.push({
            songId,
            message: userMessage
          })
        }
      }

      // Refresh the playlist songs if any were added successfully
      if (addedSongs.length > 0) {
        await loadPlaylistSongs(selectedPlaylist.id)
        
        notifications.showSuccess(
          'Songs added', 
          `Successfully added ${addedSongs.length} song${addedSongs.length > 1 ? 's' : ''} to the setlist`
        )
      }
      
      // Show errors if any occurred
      if (errors.length > 0) {
        const errorMessages = errors.map(e => `• Song ${e.songId}: ${e.message}`).join('\n')
        notifications.showError(
          `Failed to add ${errors.length} song${errors.length > 1 ? 's' : ''}`,
          errorMessages
        )
      }
      
      // Close the dialog if we had some successful changes (additions or removals)
      // or if all operations were successful
      const hasChanges = addedSongs.length > 0 || playlistSongs.length > 0
      const hasNoErrors = errors.length === 0
      
      if (hasChanges && (hasNoErrors || addedSongs.length > errors.length)) {
        setShowAddSongsDialog(false)
        setSelectedSongsForAdd([])
      }
    } catch (err) {
      console.error('Failed to add songs to playlist')
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      
      // Provide more specific error messages for common issues
      let userMessage = 'Unable to add songs'
      if (errorMessage.includes('foreign key constraint')) {
        if (errorMessage.includes('playlist_id_fkey')) {
          userMessage = 'The selected playlist no longer exists or is not accessible'
        } else if (errorMessage.includes('song_id_fkey')) {
          userMessage = 'One or more selected songs no longer exist'
        }
      }
      
      notifications.showError('Add failed', `${userMessage}: ${errorMessage}`)
    } finally {
      setAddingSongs(false)
    }
  }

  const handleRemoveSongFromPlaylist = async (playlistSongId: string) => {
    if (!selectedPlaylist) {
      console.error('No playlist selected for song removal')
      return
    }
    
    // Check if the song exists in the current playlist
    const songInPlaylist = playlistSongs.find(ps => ps.id === playlistSongId)
    if (!songInPlaylist) {
      console.error('Song not found in the current playlist')
      notifications.showError('Error', 'Song not found in the current setlist')
      return
    }
    
    // Optimistically update the UI
    const previousPlaylistSongs = [...playlistSongs]
    const updatedPlaylistSongs = playlistSongs.filter(ps => ps.id !== playlistSongId)
    setPlaylistSongs(updatedPlaylistSongs)
    
    // Add to deleting state
    setDeletingIds(prev => [...prev, playlistSongId])
    
    try {
      // Remove the song from the playlist
      await playlistDb.removeSong(selectedPlaylist.id, songInPlaylist.songId)
      
      // Refresh the playlist songs to ensure sync with server
      await loadPlaylistSongs(selectedPlaylist.id)
      notifications.showSuccess('Song removed', 'The song has been removed from the setlist')
    } catch (err) {
      console.error('Failed to remove song from playlist')
      
      // Revert the optimistic update on error
      setPlaylistSongs(previousPlaylistSongs)
      
      // More specific error handling
      let errorMessage = 'Unable to remove song from setlist'
      if (err instanceof Error) {
        if (err.message.includes('not found') || err.message.includes('does not exist')) {
          errorMessage = 'The song was not found in the setlist'
        } else if (err.message.includes('permission')) {
          errorMessage = 'You do not have permission to remove this song'
        }
      }
      
      notifications.showError('Remove failed', errorMessage)
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== playlistSongId))
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
      <PageSkeleton 
        withHeader={true}
        withSearch={true}
        withFilters={false}
        contentSkeleton={() => (
          <div className="space-y-4">
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
          </div>
        )}
      />
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="text-white hover:text-white/80 text-sm mb-2 px-3 py-1.5 border border-border rounded-md hover:border-primary/50 transition-colors bg-transparent inline-flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Back to Setlists
              </button>
              <h2 className="text-xl font-semibold text-foreground">{selectedPlaylist.name}</h2>
              {selectedPlaylist.description && (
                <p className="text-muted-foreground text-sm">{selectedPlaylist.description}</p>
              )}
            </div>
            
            {canEdit && (
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                      aria-label="Setlist options"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => setShowAddSongsDialog(true)}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>{playlistSongs.length > 0 ? 'Edit Songs' : 'Add Songs'}</span>
                    </DropdownMenuItem>
                    {playlistSongs.length > 0 && (
                      <DropdownMenuItem 
                        onClick={clearSetlist}
                        disabled={resetting}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        {resetting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="mr-2 h-4 w-4" />
                        )}
                        <span>{resetting ? 'Resetting...' : 'Reset Setlist'}</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          
          {/* Display mode selector */}
          <div className="mt-4">
            <div className="inline-flex gap-2 bg-muted/20 p-0.5 rounded-md">
              {(['both', 'chords', 'lyrics'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setDisplayMode(m)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    displayMode === m 
                      ? 'bg-primary text-primary-foreground shadow' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {m === 'both' ? 'Both' : m === 'lyrics' ? 'Lyrics' : 'Chords'}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sticky Song Navigation Tabs */}
        {playlistSongs.length > 0 && (
          <div className="sticky top-0 z-20 border-b border-border bg-card -mt-px">
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
        )}

        {playlistSongs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8 mt-4">
            <ListMusic className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Songs Yet</h3>
            <p className="text-muted-foreground mb-4">Add songs to start building your playlist</p>
            {canEdit && (
              <button
                onClick={() => {
                  setSelectedSongsForAdd([]) // Reset selected songs
                  setShowAddSongsDialog(true)
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add First Song
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-1">
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
                          <div className="flex items-center gap-1">
                            <button 
                              type="button" 
                              onClick={decreaseFont}
                              onMouseDown={e => e.preventDefault()}
                              onFocus={e => e.target.blur()}
                              className="px-2 py-1 text-sm bg-transparent text-muted-foreground rounded focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-transparent focus:shadow-none select-none active:bg-transparent"
                              aria-label="Decrease font size"
                            >
                              A-
                            </button>
                            <button 
                              type="button" 
                              onClick={resetFont}
                              onMouseDown={e => e.preventDefault()}
                              onFocus={e => e.target.blur()}
                              className="px-2 py-1 text-sm bg-transparent text-muted-foreground rounded focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-transparent focus:shadow-none select-none active:bg-transparent"
                              aria-label="Reset font size"
                            >
                              Reset
                            </button>
                            <button 
                              type="button" 
                              onClick={increaseFont}
                              onMouseDown={e => e.preventDefault()}
                              onFocus={e => e.target.blur()}
                              className="px-2 py-1 text-sm bg-transparent text-muted-foreground rounded focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-transparent focus:shadow-none select-none active:bg-transparent"
                              aria-label="Increase font size"
                            >
                              A+
                            </button>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleRemoveSongFromPlaylist(playlistSong.id)}
                              className="p-1.5 text-white/90 hover:text-white hover:bg-destructive/20 rounded transition-colors"
                              disabled={deletingIds.includes(playlistSong.id)}
                              aria-label={`Remove ${playlistSong.song?.title} from setlist`}
                            >
                              {deletingIds.includes(playlistSong.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash className="h-4 w-4" />
                              )}
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
                        <div className="mb-6" style={{ fontSize: '0.875rem' }}>
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-foreground flex items-center gap-2 text-base">
                                <Music className="h-4 w-4" />
                                <span>{shouldShowChords(playlistSong.song.id) ? `Chords in ${getSongKey(playlistSong.song.id)}` : 'Chords'}</span>
                              </h4>
                              <button
                                onClick={() => toggleShowChords(playlistSong.song.id)}
                                onMouseDown={e => e.preventDefault()}
                                onFocus={e => e.target.blur()}
                                className={`h-10 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-transparent focus:shadow-none select-none active:bg-transparent active:scale-100 ${
                                  shouldShowChords(playlistSong.song.id)
                                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20 hover:border-destructive/50'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20 hover:border-primary/50'
                                }`}
                              >
                                {shouldShowChords(playlistSong.song.id) ? 'Back to Nashville' : 'Show Chords'}
                              </button>
                            </div>
                            {shouldShowChords(playlistSong.song.id) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground">Select Key:</div>
                                  <div className="w-full overflow-x-auto pb-1">
                                    <div className="flex gap-1.5 w-max">
                                      {['Ab', 'A', 'A#', 'Bb', 'B', 'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#'].map(key => (
                                        <button
                                          key={key}
                                          onClick={() => setSongKey(playlistSong.song.id, key)}
                                          onMouseDown={e => e.preventDefault()}
                                          onFocus={e => e.target.blur()}
                                          className={`min-w-[34px] h-9 flex-shrink-0 flex items-center justify-center text-xs font-medium rounded border transition-all focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent focus:ring-transparent focus:shadow-none select-none active:bg-transparent active:scale-100 ${
                                            getSongKey(playlistSong.song.id) === key
                                              ? 'bg-primary text-primary-foreground border-primary scale-105'
                                              : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                                          }`}
                                          title={`Key of ${key}`}
                                        >
                                          {key}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div 
                            className="whitespace-pre-wrap font-mono bg-muted/10 p-4 rounded-md"
                            style={{ 
                              fontSize: `${contentFontSize}px`,
                              lineHeight: '1.5'
                            }}
                          >
                            {shouldShowChords(playlistSong.song.id)
                              ? convertNashvilleToChords(playlistSong.song.chords, getSongKey(playlistSong.song.id))
                              : playlistSong.song.chords}
                          </div>
                          
                          {/* Original Nashville Numbers (collapsible) - Only show when displaying chords */}
                          {shouldShowChords(playlistSong.song.id) && (
                            <details className="mt-3 text-sm">
                              <summary className="text-muted-foreground cursor-pointer hover:text-foreground text-xs">
                                Show original Nashville numbers
                              </summary>
                              <div 
                                className="mt-2 p-2 bg-muted/5 rounded font-mono whitespace-pre-wrap"
                                style={{ fontSize: `${contentFontSize}px` }}
                              >
                                {playlistSong.song.chords}
                              </div>
                            </details>
                          )}
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
        )}
            
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
                                {deletingIds.includes(playlistSong.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                                ) : (
                                  <Trash className="w-4 h-4 text-destructive" />
                                )}
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
                              className="text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded transition-colors"
                              aria-label="Remove song"
                            >
                              <Trash className="h-4 w-4" />
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
                  disabled={addingSongs}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {addingSongs ? 'Saving...' : (playlistSongs.length > 0 ? 'Save' : 'Add to Setlist')}
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
        <h2 className="text-xl font-semibold text-foreground">Set of Line-ups</h2>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
             
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
                      <p className="text-sm text-muted-foreground">{playlist.description}</p>
                    )}
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-md p-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(playlist)}
                        className="p-1.5 text-white/90 hover:text-white hover:bg-primary/20 rounded transition-colors"
                        aria-label={`Edit ${playlist.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="p-1.5 text-white/90 hover:text-white hover:bg-destructive/20 rounded transition-colors"
                        disabled={deletingIds.includes(playlist.id)}
                        aria-label={`Delete ${playlist.name}`}
                      >
                        {deletingIds.includes(playlist.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash className="h-4 w-4" />
                        )}
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