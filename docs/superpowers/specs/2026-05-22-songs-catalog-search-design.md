# Songs Catalog Search Design
**Date:** 2026-05-22

## Overview

Add a client-side search field to the admin songs catalog page so admins can quickly find songs by title, artist, year, or tag.

---

## Architecture

The catalog page at `app/admin/(protected)/page.tsx` is a Next.js server component. It will remain a server component — it fetches all songs at request time and passes them as a prop to a new `"use client"` component `components/SongCatalogList.tsx`, which owns the search input and filtered rendering.

This follows the same server-fetches / client-filters pattern used in `PlaylistSongsEditor`.

---

## Components

### `app/admin/(protected)/page.tsx` (modified)

- Fetches songs via `listSongs()` as before
- Passes `songs` to `<SongCatalogList songs={songs} />`
- Removes the inline song list rendering (moved to `SongCatalogList`)
- Keeps the page header ("Song catalog", count display, add/bulk-import links)

The count display in the header (`{songs.length} songs`) is the **total** count from the server — unchanged regardless of the search filter.

### `components/SongCatalogList.tsx` (new, `"use client"`)

**Props:** `songs: Song[]`

**State:** `query: string` (search input value, default `""`)

**Filter logic:**

```ts
const q = query.toLowerCase().trim();
const filtered = q === ""
  ? songs
  : songs.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      String(s.release_year).includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
```

**UI structure:**

1. Search input — full width, placeholder `"Search title, artist, year or tag…"`, styled consistently with other inputs in the admin UI (`border-neutral-700 bg-neutral-950 rounded-lg px-3 py-2`)
2. Result count line — `"{filtered.length} of {songs.length} songs"` when query is non-empty; hidden when query is empty
3. Song list — same rendering as the current inline list (album art, title, artist, tags, year editor form, delete form)
4. Empty state — when `filtered.length === 0` and query is non-empty: `"No songs match "{query}"`

The year editor (`updateYearAction`) and delete (`deleteSongAction`) server action forms work unchanged inside a client component.

---

## Out of Scope

- Server-side / Supabase-level filtering
- Sorting controls
- Pagination
