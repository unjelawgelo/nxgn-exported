import { api } from './api';
import type { User, Ministry, Song, Playlist, JoinRequest, PlaylistSong } from '../types/database';

// User utilities
export const userDb = {
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    return await api.post('/users', userData);
  },

  async findByPincode(pincode: string): Promise<User | null> {
    return await api.get(`/users/by-pincode/${encodeURIComponent(pincode)}`);
  },

  async findById(id: string): Promise<User | null> {
    return await api.get(`/users/${encodeURIComponent(id)}`);
  },

  async getByMinistry(ministryId: string): Promise<User[]> {
    return await api.get(`/users?ministryId=${encodeURIComponent(ministryId)}`);
  },

  async listAll(): Promise<User[]> {
    return await api.get(`/users`);
  },

  async update(id: string, updates: Partial<User>) {
    return await api.patch(`/users/${encodeURIComponent(id)}`, updates);
  }
};

// Ministry utilities
export const ministryDb = {
  async create(ministryData: Omit<Ministry, 'id' | 'createdAt' | 'updatedAt'>) {
    return await api.post('/ministries', ministryData);
  },

  async findByPasscode(passcode: string): Promise<Ministry | null> {
    return await api.get(`/ministries/by-passcode/${encodeURIComponent(passcode)}`);
  },

  async findById(id: string): Promise<Ministry | null> {
    return await api.get(`/ministries/${encodeURIComponent(id)}`);
  },

  async listAll(): Promise<Ministry[]> {
    return await api.get('/ministries');
  },

  async update(id: string, updates: Partial<Ministry>) {
    return await api.patch(`/ministries/${encodeURIComponent(id)}`, updates);
  }
};

// Song utilities
export const songDb = {
  async create(songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>) {
    return await api.post('/songs', songData);
  },

  async getByMinistry(ministryId: string, category?: 'worship' | 'praise'): Promise<Song[]> {
    const params = new URLSearchParams({ ministryId });
    if (category) params.set('category', category);
    return await api.get(`/songs?${params.toString()}`);
  },

  async search(ministryId: string, queryStr: string, category?: 'worship' | 'praise'): Promise<Song[]> {
    const params = new URLSearchParams({ ministryId });
    if (category) params.set('category', category);
    if (queryStr?.trim()) params.set('q', queryStr.trim());
    return await api.get(`/songs/search?${params.toString()}`);
  },

  async update(id: string, updates: Partial<Song>) {
    return await api.patch(`/songs/${encodeURIComponent(id)}`, updates);
  },

  async delete(id: string) {
    await api.delete(`/songs/${encodeURIComponent(id)}`);
  }
};

// Playlist utilities
export const playlistDb = {
  async create(playlistData: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>) {
    return await api.post('/playlists', playlistData);
  },

  async getByMinistry(ministryId: string): Promise<Playlist[]> {
    return await api.get(`/playlists?ministryId=${encodeURIComponent(ministryId)}`);
  },

  async addSong(playlistId: string, songId: string) {
    return await api.post('/playlist-songs', { playlistId, songId });
  },

  async removeSong(playlistId: string, songId: string) {
    await api.delete(`/playlist-songs?playlistId=${encodeURIComponent(playlistId)}&songId=${encodeURIComponent(songId)}`);
  },

  async getSongs(playlistId: string): Promise<Song[]> {
    return await api.get(`/playlist-songs?playlistId=${encodeURIComponent(playlistId)}`);
  },

  async update(id: string, updates: Partial<Playlist>) {
    return await api.patch(`/playlists/${encodeURIComponent(id)}`, updates);
  },

  async delete(id: string) {
    await api.delete(`/playlists/${encodeURIComponent(id)}`);
  }
};

// Join Request utilities
export const joinRequestDb = {
  async create(requestData: Omit<JoinRequest, 'id' | 'requestedAt'>) {
    // The server expects ministryId, userName, pincode
    const payload: any = {
      ministryId: (requestData as any).ministryId,
      userName: (requestData as any).userName,
      pincode: (requestData as any).pincode,
    };
    return await api.post('/join-requests', payload);
  },

  async getPendingForMinistry(ministryId: string): Promise<JoinRequest[]> {
    return await api.get(`/join-requests/pending?ministryId=${encodeURIComponent(ministryId)}`);
  },

  async approve(id: string, reviewedBy: string) {
    return await api.post(`/join-requests/${encodeURIComponent(id)}/approve`, { reviewedBy });
  },

  async decline(id: string, reviewedBy: string) {
    return await api.post(`/join-requests/${encodeURIComponent(id)}/decline`, { reviewedBy });
  }
};

// Auth utilities
export const authUtils = {
  async authenticateUser(pincode: string): Promise<User | null> {
    return await userDb.findByPincode(pincode);
  },

  async createUser(name: string, pincode: string, role: 'main_admin' | 'sub_admin' | 'user' = 'user'): Promise<User> {
    return await userDb.create({ name, pincode, role, status: 'active' } as any);
  },

  async joinMinistry(userId: string, ministryId: string): Promise<void> {
    await userDb.update(userId, { ministryId } as any);
  }
};