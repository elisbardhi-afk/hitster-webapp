-- supabase/migrations/0002_playlists.sql

create table playlists (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text not null default '',
  cover_image_url text,
  created_at      timestamptz not null default now()
);

create table playlist_songs (
  playlist_id  uuid not null references playlists(id) on delete cascade,
  song_id      uuid not null references songs(id) on delete cascade,
  primary key (playlist_id, song_id)
);

alter table playlists enable row level security;
alter table playlist_songs enable row level security;

-- Players need to read playlists for the room creation page.
create policy "public read playlists" on playlists for select using (true);
-- Game server needs to read playlist_songs to filter the draw pile.
create policy "public read playlist_songs" on playlist_songs for select using (true);
