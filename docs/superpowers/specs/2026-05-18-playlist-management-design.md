# Playlist Management — Design Spec

**Date:** 2026-05-18
**Status:** Approved

## Overview

Admin creates named playlists (name, description, cover image). Songs belong to many playlists via a join table. Players pick one playlist when creating an online room — this replaces the existing decade and category checkboxes entirely.

---

## Data Model

Two new DB tables added via a Supabase migration:

```sql
create table playlists (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text not null default '',
  cover_image_url text,                        -- nullable; admin pastes any image URL
  created_at      timestamptz not null default now()
);

create table playlist_songs (
  playlist_id  uuid not null references playlists(id) on delete cascade,
  song_id      uuid not null references songs(id) on delete cascade,
  primary key (playlist_id, song_id)
);
```

`GameState` (in `lib/game-rules-types.ts`) gains one new optional field:

```typescript
playlistId?: string   // uuid of selected playlist; absent = full catalog
```

The existing `tagFilter?: string[]` and `categoryFilter?: string[]` fields remain in the type as unused optionals for back-compat with in-flight games. They are no longer written or read by new room creation.

---

## Backend — Data Layer (`lib/playlists.ts`)

New file with all playlist CRUD and the song-membership helpers:

| Function | Description |
|----------|-------------|
| `listPlaylists()` | All playlists ordered by name, with `song_count` |
| `getPlaylist(id)` | Single playlist or null |
| `createPlaylist(opts)` | Insert new playlist, return it |
| `updatePlaylist(id, opts)` | Update name / description / cover_image_url |
| `deletePlaylist(id)` | Deletes playlist (cascade removes playlist_songs rows) |
| `listPlaylistSongIds(playlistId)` | Array of song UUIDs in the playlist |
| `setPlaylistSongs(playlistId, songIds)` | Replace full membership atomically (delete + insert) |

`listPlaylists()` returns a `Playlist` type that includes a computed `song_count`:
```typescript
type Playlist = {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  created_at: string;
  song_count: number;
};
```

---

## Backend — Room Filtering (`lib/games.ts`)

`createRoom()` gains `playlistId?: string` in its opts and stores it in `initialState.playlistId`.

`startRoom()` filtering logic:

```typescript
const playlistId = room.state.playlistId ?? null;

let songs: Song[];
if (playlistId) {
  const ids = await listPlaylistSongIds(playlistId);
  const idSet = new Set(ids);
  songs = allSongs.filter((s) => idSet.has(s.id));
} else {
  songs = allSongs;
}

if (songs.length < room.state.players.length + 1) {
  const label = playlistId ? `playlist` : `catalog`;
  throw new Error(
    `Not enough songs in ${label}. Need at least ${room.state.players.length + 1}, found ${songs.length}.`
  );
}
```

The old `filterSongs` helper and its imports remain in `lib/games.ts` but are no longer called by `startRoom()`.

---

## Admin UI

### Routes

| Route | Purpose |
|-------|---------|
| `app/admin/(protected)/playlists/page.tsx` | List all playlists |
| `app/admin/(protected)/playlists/new/page.tsx` | Create playlist form |
| `app/admin/(protected)/playlists/[id]/page.tsx` | Edit details + manage songs |
| `app/admin/(protected)/playlists/actions.ts` | Server actions for all mutations |

### Playlist list (`/admin/playlists`)

- Link added to existing admin nav
- Cards: cover image (gradient fallback), name, description, song count, Edit / Delete buttons
- "New playlist" button top-right

### Edit playlist (`/admin/playlists/[id]`)

Two independent panels:

**Details panel** — name, description, cover image URL inputs + "Save details" button (calls `updatePlaylist`).

**Songs panel** — search bar (filters by title/artist client-side), full catalog list with fuchsia checkboxes (checked = in playlist). "Save song list" button calls `setPlaylistSongs` with the current checked IDs. Song count shown in panel header.

### Server actions (`playlists/actions.ts`)

| Action | Calls |
|--------|-------|
| `createPlaylistAction` | `createPlaylist()` → redirect to `/admin/playlists/[id]` |
| `updatePlaylistAction` | `updatePlaylist()` → `revalidatePath` |
| `deletePlaylistAction` | `deletePlaylist()` → redirect to `/admin/playlists` |
| `updatePlaylistSongsAction` | `setPlaylistSongs()` → `revalidatePath` |

---

## Player UI — Room Creation (`app/online/new/page.tsx`)

The decade fieldset and category fieldset are removed.

A new **Playlist** fieldset replaces them — a radio list where each item shows:
- Cover image (or gradient emoji fallback)
- Name (bold)
- Description + song count (muted)

"Full Catalog" is always the first item and is selected by default (`value=""`). Each admin playlist appears below it. The selected item gets a fuchsia border highlight.

The `createRoomAction` in `app/online/new/actions.ts` reads `playlistId` from form data (empty string → stored as `undefined` in GameState).

---

## Affected Files

| File | Action |
|------|--------|
| `supabase/migrations/0002_playlists.sql` | Create `playlists` + `playlist_songs` tables |
| `lib/playlists.ts` | New — all playlist CRUD + song membership helpers |
| `lib/game-rules-types.ts` | Add `playlistId?: string` to `GameState` |
| `lib/games.ts` | `createRoom()` + `startRoom()` updated |
| `app/online/new/page.tsx` | Replace decade/category fieldsets with playlist radio list |
| `app/online/new/actions.ts` | Read `playlistId` from form data |
| `app/admin/(protected)/playlists/page.tsx` | New — playlist list |
| `app/admin/(protected)/playlists/new/page.tsx` | New — create playlist form |
| `app/admin/(protected)/playlists/[id]/page.tsx` | New — edit playlist + song management |
| `app/admin/(protected)/playlists/actions.ts` | New — server actions |

---

## Out of Scope

- Playlist ordering / drag-to-reorder songs within a playlist
- File upload for cover images (admin pastes a URL)
- Public playlist sharing or player-created playlists
- Migrating existing game rooms to use `playlistId`
- Removing `tagFilter` / `categoryFilter` from the codebase (kept for back-compat)
- The Albanian Songs tag toggle in admin (kept, harmless)
