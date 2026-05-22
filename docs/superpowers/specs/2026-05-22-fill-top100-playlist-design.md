# Fill Top 100 Playlist — Design Spec

**Date:** 2026-05-22
**Status:** Approved

## Overview

A one-time (but re-runnable) Node.js script that fills the existing "Top 100" playlist with all reference songs. Songs not already in the Supabase catalog are imported from Spotify first (via the Search API), then added to the playlist. Songs with no available 30-second preview are skipped and logged.

---

## Deliverable

Single new file: `scripts/fill-top100-playlist.mjs`

Follows the existing `.mjs` convention: ES modules, manual `.env.local` load, `@supabase/supabase-js` + `ws`, Spotify Client Credentials auth via `fetch`. No web app files are changed.

---

## Script Steps

1. Load `.env.local` (Supabase + Spotify credentials)
2. Look up the "Top 100" playlist by name in Supabase — abort with a clear message if not found
3. Read current playlist song IDs into a `Set`
4. Read full `songs` catalog into a `Map` keyed by `normalize(title)||normalize(artist)`
5. Get a Spotify access token (Client Credentials)
6. For each entry in the reference list (same list as `seed-top100-playlist.mjs`):
   - If song ID is already in the playlist → log `✓ already`, skip
   - If song is in the catalog but not in the playlist → add to `playlist_songs`, log `✓ from catalog`
   - If song is not in the catalog → call Spotify Search, import the top result, add to playlist, log `✓ imported`
   - If Spotify search returns no results → log `✗ not found`
   - If track has no preview URL (API + embed fallback both fail) → log `✗ no preview`, skip
7. Print summary table and final playlist song count + edit URL

---

## Spotify Search

Endpoint: `GET https://api.spotify.com/v1/search?q=track:"${title}" artist:"${artist}"&type=track&limit=1`

Takes the first result. A 200ms delay between search calls prevents rate-limiting (same pattern as `fetch-top-songs.mjs`).

---

## Preview URL Resolution

1. Check `track.preview_url` from the Search API response
2. If null, scrape `https://open.spotify.com/embed/track/{id}` for `"audioPreview":{"url":"…"}` or `"previewUrl":"…"` (same fallback as `lib/spotify.ts`)
3. If still null → skip the song (log `✗ no preview`)

---

## Song Import (upsert)

Insert into `songs` using Supabase upsert on `spotify_id`:

```sql
INSERT INTO songs (spotify_id, title, artist, release_year, preview_url, album_art_url, tags)
VALUES (...)
ON CONFLICT (spotify_id) DO NOTHING
```

`tags` defaults to `[]`. Existing catalog rows are never overwritten.

---

## Playlist Update

After importing, insert into `playlist_songs`:

```sql
INSERT INTO playlist_songs (playlist_id, song_id) VALUES (...)
ON CONFLICT DO NOTHING
```

Uses upsert/ignore-on-conflict so re-runs don't duplicate entries.

---

## Idempotency

Re-running is safe:
- Songs already in the playlist are detected upfront (step 3) and skipped
- `upsert ON CONFLICT DO NOTHING` on `songs` prevents duplicate catalog rows
- `INSERT ON CONFLICT DO NOTHING` on `playlist_songs` prevents duplicate membership rows

---

## Output Format

```
Looking up "Top 100" playlist... found (5 songs already in it).
Loading catalog... 395 songs.

Processing 149 reference songs...

✓ already      Bad Romance — Lady Gaga
✓ already      Anti-Hero — Taylor Swift
✓ imported     Bohemian Rhapsody — Queen  (spotify:track:7tFiyTwD0nx5a1eklYtX2J)
✓ from catalog Blinding Lights — The Weeknd
✗ no preview   Johnny B. Goode — Chuck Berry
✗ not found    Tutti Frutti — Little Richard
...

─────────────────────────────────────────
Already in playlist:    5
Added from catalog:     3
Imported from Spotify: 118
Skipped (no preview):  14
Not found on Spotify:   9
─────────────────────────────────────────
"Top 100" playlist now has 126 songs.
Edit it at: /admin/playlists/1d2d059f-4ba8-4e0f-87a0-6b42c0528f8e
```

---

## Required Env Vars

From `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

---

## How to Run

```bash
node scripts/fill-top100-playlist.mjs
```

Must be run after `seed-top100-playlist.mjs` has already created the "Top 100" playlist.

---

## Affected Files

| File | Action |
|------|--------|
| `scripts/fill-top100-playlist.mjs` | New — fill + import script |

No changes to web app routes, components, or the data model.

---

## Out of Scope

- Handling duplicate Spotify track IDs already in the catalog under a different title/artist
- Selecting a non-top Spotify search result
- Manual review step before import
- Removing wrong matches (use the admin playlist editor at `/admin/playlists/[id]`)
