-- HITSTER Albanian — initial schema
-- Applied via the Supabase dashboard SQL editor or `supabase db push`

create extension if not exists "uuid-ossp";

create table songs (
  id            uuid primary key default uuid_generate_v4(),
  spotify_id    text unique not null,
  title         text not null,
  artist        text not null,
  release_year  int  not null,
  preview_url   text not null,
  album_art_url text,
  added_at      timestamptz not null default now(),
  tags          text[] not null default '{}'
);

create index songs_release_year_idx on songs (release_year);
create index songs_tags_idx on songs using gin (tags);

create table games (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  status      text not null check (status in ('lobby', 'playing', 'finished')),
  variant     text not null check (variant in ('original', 'pro', 'expert', 'coop')),
  state       jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index games_status_idx on games (status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger games_set_updated_at
before update on games
for each row execute function set_updated_at();

create table admin_sessions (
  token       text primary key,
  expires_at  timestamptz not null
);

create index admin_sessions_expires_at_idx on admin_sessions (expires_at);

-- Row-level security
alter table songs enable row level security;
alter table games enable row level security;
alter table admin_sessions enable row level security;

-- Anyone (anon key) can read songs; only service role can write.
create policy "public read songs" on songs for select using (true);

-- Anyone (anon key) can read and update games (room code is the secret).
-- For production hardening, add a per-row token check.
create policy "public read games"   on games for select using (true);
create policy "public update games" on games for update using (true);
create policy "public insert games" on games for insert with check (true);

-- admin_sessions: service role only (no anon access).
