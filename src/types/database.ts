// Database types for NXGN worship management app

export interface User {
  id: string;
  name: string;
  pincode: string;
  role: 'main_admin' | 'sub_admin' | 'user';
  profilePhoto?: string;
  customTag?: string;
  customTagColor?: string;
  ministryId?: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Ministry {
  id: string;
  name: string;
  passcode: string;
  description?: string;
  adminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  lyrics?: string;
  chords?: string;
  category: 'worship' | 'praise';
  ministryId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  ministryId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId: string;
  position: number;
  addedAt: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  ministryId: string;
  status: 'pending' | 'approved' | 'declined';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// Extended types with relationships
export interface UserWithMinistry extends User {
  ministry?: Ministry;
}

export interface SongWithCreator extends Song {
  creator: User;
}

export interface PlaylistWithSongs extends Playlist {
  songs: (Song & { position: number })[];
  creator: User;
}

export interface JoinRequestWithDetails extends JoinRequest {
  user: User;
  ministry: Ministry;
  reviewer?: User;
}

// Database table names (camelCase for SDK)
export type DatabaseTables = {
  users: User;
  ministries: Ministry;
  songs: Song;
  playlists: Playlist;
  playlistSongs: PlaylistSong;
  joinRequests: JoinRequest;
};