import { api } from '../lib/api';

// Minimal Blink client compatibility shim that proxies to our REST API
// Supports the subset used by the app: list/create/update/delete with simple where filters

type Where = Record<string, any> | undefined;
type ListOpts = { where?: Where; orderBy?: Record<string, 'asc' | 'desc'>; limit?: number } | undefined;

async function users_list(opts?: ListOpts) {
  const where = opts?.where || {};
  if (where.pincode) {
    const user = await api.get(`/users/by-pincode/${encodeURIComponent(where.pincode)}`);
    return user ? [user] : [];
  }
  if (where.id) {
    const user = await api.get(`/users/${encodeURIComponent(where.id)}`);
    return user ? [user] : [];
  }
  if (where.ministryId) {
    return await api.get(`/users?ministryId=${encodeURIComponent(where.ministryId)}`);
  }
  return await api.get(`/users`);
}

async function users_create(row: any) {
  // server generates id/timestamps
  return await api.post('/users', row);
}

async function users_update(id: string, patch: any) {
  return await api.patch(`/users/${encodeURIComponent(id)}`, patch);
}

async function users_delete(id: string) {
  // not used currently
  return await api.delete(`/users/${encodeURIComponent(id)}`);
}

async function ministries_list(opts?: ListOpts) {
  const where = opts?.where || {};
  if (where.passcode) {
    const m = await api.get(`/ministries/by-passcode/${encodeURIComponent(where.passcode)}`);
    return m ? [m] : [];
  }
  if (where.id) {
    const m = await api.get(`/ministries/${encodeURIComponent(where.id)}`);
    return m ? [m] : [];
  }
  return await api.get('/ministries');
}

async function ministries_create(row: any) {
  return await api.post('/ministries', row);
}

async function ministries_update(id: string, patch: any) {
  return await api.patch(`/ministries/${encodeURIComponent(id)}`, patch);
}

async function ministries_delete(id: string) {
  return await api.delete(`/ministries/${encodeURIComponent(id)}`);
}

async function songs_list(opts?: ListOpts) {
  const where = opts?.where || {};
  const params = new URLSearchParams();
  if (where.ministryId) params.set('ministryId', where.ministryId);
  if (where.category) params.set('category', where.category);
  return await api.get(`/songs?${params.toString()}`);
}

async function songs_create(row: any) {
  return await api.post('/songs', row);
}

async function songs_update(id: string, patch: any) {
  return await api.patch(`/songs/${encodeURIComponent(id)}`, patch);
}

async function songs_delete(id: string) {
  return await api.delete(`/songs/${encodeURIComponent(id)}`);
}

async function playlists_list(opts?: ListOpts) {
  const where = opts?.where || {};
  if (where.ministryId) {
    return await api.get(`/playlists?ministryId=${encodeURIComponent(where.ministryId)}`);
  }
  // no generic list route used elsewhere
  return [];
}

async function playlists_create(row: any) {
  return await api.post('/playlists', row);
}

async function playlists_update(id: string, patch: any) {
  return await api.patch(`/playlists/${encodeURIComponent(id)}`, patch);
}

async function playlists_delete(id: string) {
  return await api.delete(`/playlists/${encodeURIComponent(id)}`);
}

async function playlistSongs_list(opts?: ListOpts) {
  const where = opts?.where || {};
  // For our usage, we only need to support filtering by playlistId and optionally songId for deletes
  if (where.playlistId && where.songId) {
    // No direct list API; emulate by checking existence via songs list and mapping minimal shape
    const songs = await api.get(`/playlist-songs?playlistId=${encodeURIComponent(where.playlistId)}`);
    return songs
      .filter((s: any) => s.id === where.songId)
      .map((s: any) => ({ id: s.id, playlistId: where.playlistId, songId: s.id }));
  }
  if (where.playlistId) {
    const songs = await api.get(`/playlist-songs?playlistId=${encodeURIComponent(where.playlistId)}`);
    return songs.map((s: any, idx: number) => ({ id: s.id, playlistId: where.playlistId, songId: s.id, position: idx }));
  }
  return [];
}

async function playlistSongs_create(row: any) {
  return await api.post('/playlist-songs', row);
}

async function playlistSongs_delete(idOrUnknown: string) {
  // Our server supports deletion by composite via query params; if we receive an id, we cannot use it directly.
  // This shim will no-op since components don't call delete by id in current code.
  return null as any;
}

export const blink = {
  db: {
    users: { list: users_list, create: users_create, update: users_update, delete: users_delete },
    ministries: { list: ministries_list, create: ministries_create, update: ministries_update, delete: ministries_delete },
    songs: { list: songs_list, create: songs_create, update: songs_update, delete: songs_delete },
    playlists: { list: playlists_list, create: playlists_create, update: playlists_update, delete: playlists_delete },
    playlistSongs: { list: playlistSongs_list, create: playlistSongs_create, delete: playlistSongs_delete },
  },
} as const;