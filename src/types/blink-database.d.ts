declare module '@blinkdotnew/sdk' {
  // Table row definitions (camelCase fields as used by the SDK)
  interface MinistriesRow {
    id: string
    name: string
    passcode: string
    adminId?: string
    description?: string
    profilePhoto?: string
    createdAt?: string
  }

  interface UsersRow {
    id: string
    name: string
    pincode?: string
    role?: string
    ministryId?: string
    status?: string
    profilePhoto?: string
    customTag?: string
    tagColor?: string
    createdAt?: string
  }

  interface SongsRow {
    id: string
    title: string
    lyrics?: string
    chords?: string
    category: string
    ministryId: string
    createdBy: string
    createdAt?: string
  }

  interface PlaylistsRow {
    id: string
    name: string
    description?: string
    ministryId: string
    createdBy: string
    createdAt?: string
  }

  interface PlaylistSongsRow {
    id: string
    playlistId: string
    songId: string
    position: number
    transition?: string
    createdAt?: string
  }

  interface PlaylistSongTransitionsRow {
    id: string
    playlistSongId: string
    transition?: string
    userId?: string
    createdAt?: string
  }

  interface BlinkDatabase {
    ministries: {
      list: (opts?: any) => Promise<MinistriesRow[]>
      create: (row: Partial<MinistriesRow>) => Promise<MinistriesRow>
      update: (id: string, patch: Partial<MinistriesRow>) => Promise<MinistriesRow>
      delete: (id: string) => Promise<void>
    }
    users: {
      list: (opts?: any) => Promise<UsersRow[]>
      create: (row: Partial<UsersRow>) => Promise<UsersRow>
      update: (id: string, patch: Partial<UsersRow>) => Promise<UsersRow>
      delete: (id: string) => Promise<void>
    }
    songs: {
      list: (opts?: any) => Promise<SongsRow[]>
      create: (row: Partial<SongsRow>) => Promise<SongsRow>
      update: (id: string, patch: Partial<SongsRow>) => Promise<SongsRow>
      delete: (id: string) => Promise<void>
    }
    playlists: {
      list: (opts?: any) => Promise<PlaylistsRow[]>
      create: (row: Partial<PlaylistsRow>) => Promise<PlaylistsRow>
      update: (id: string, patch: Partial<PlaylistsRow>) => Promise<PlaylistsRow>
      delete: (id: string) => Promise<void>
    }
    playlistSongs: {
      list: (opts?: any) => Promise<PlaylistSongsRow[]>
      create: (row: Partial<PlaylistSongsRow>) => Promise<PlaylistSongsRow>
      update: (id: string, patch: Partial<PlaylistSongsRow>) => Promise<PlaylistSongsRow>
      delete: (id: string) => Promise<void>
    }
    playlistSongTransitions: {
      list: (opts?: any) => Promise<PlaylistSongTransitionsRow[]>
      create: (row: Partial<PlaylistSongTransitionsRow>) => Promise<PlaylistSongTransitionsRow>
      update: (id: string, patch: Partial<PlaylistSongTransitionsRow>) => Promise<PlaylistSongTransitionsRow>
      delete: (id: string) => Promise<void>
    }
  }
}

export {};