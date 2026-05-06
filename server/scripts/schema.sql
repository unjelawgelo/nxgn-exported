-- Schema for Aiven PostgreSQL (IDs as text; generated in app)

create table if not exists ministries (
  id text primary key,
  name text not null,
  passcode text not null,
  admin_id text,
  description text,
  profile_photo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists users (
  id text primary key,
  name text not null,
  pincode text,
  role text,
  ministry_id text references ministries(id) on delete set null,
  status text,
  profile_photo text,
  custom_tag text,
  tag_color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists songs (
  id text primary key,
  title text not null,
  lyrics text,
  chords text,
  category text not null,
  ministry_id text not null references ministries(id) on delete cascade,
  created_by text references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists playlists (
  id text primary key,
  name text not null,
  description text,
  category text,
  date text,
  ministry_id text not null references ministries(id) on delete cascade,
  created_by text references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists playlist_songs (
  id text primary key,
  playlist_id text not null references playlists(id) on delete cascade,
  song_id text not null references songs(id) on delete cascade,
  position integer not null,
  transition text,
  added_at timestamptz default now()
);

create index if not exists idx_playlist_songs_playlist_id on playlist_songs(playlist_id);

create table if not exists playlist_song_transitions (
  id text primary key,
  playlist_song_id text not null references playlist_songs(id) on delete cascade,
  transition text,
  user_id text references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists join_requests (
  id text primary key,
  ministry_id text not null references ministries(id) on delete cascade,
  user_name text not null,
  pincode text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by text references users(id) on delete set null,
  requested_at timestamptz default now()
);
