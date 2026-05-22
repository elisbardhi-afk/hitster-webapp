# Top 2000s and Now Playlist — Design Spec

**Date:** 2026-05-22
**Status:** Approved

## Overview

A single re-runnable Node.js script that creates the "Top 2000s and Now" playlist and fills it with ~150 songs spanning 2000–2025. Songs absent from the Supabase catalog are imported from Spotify first (via the Search API). Songs with no available 30-second preview are skipped and logged.

---

## Deliverable

Single new file: `scripts/fill-2000s-playlist.mjs`

Follows the existing `.mjs` convention: ES modules, manual `.env.local` load, `@supabase/supabase-js` + `ws`, Spotify Client Credentials auth via `fetch`. No web app files are changed.

---

## Script Steps

1. Load `.env.local` (Supabase + Spotify credentials)
2. Look up "Top 2000s and Now" playlist by name in Supabase
   - If not found: create it (name = "Top 2000s and Now", description = "")
   - If found: reuse it and read current song IDs
3. Read current playlist song IDs into a `Set`
4. Read full `songs` catalog into a `Map` keyed by `normalize(title)||normalize(artist)`
5. Get a Spotify access token (Client Credentials)
6. For each entry in the reference list (~180 songs):
   - If song ID is already in the playlist → log `✓ already`, skip
   - If song is in the catalog but not in the playlist → add to `playlist_songs`, log `✓ from catalog`
   - If song is not in the catalog → call Spotify Search, import the top result, add to playlist, log `✓ imported`
   - If Spotify search returns no results → log `✗ not found`
   - If track has no preview URL (API + embed fallback both fail) → log `✗ no preview`, skip
7. Print summary table and final playlist song count + edit URL

---

## Spotify Search

Endpoint: `GET https://api.spotify.com/v1/search?q=track:"${title}" artist:"${artist}"&type=track&limit=1`

Takes the first result. A 200ms delay between search calls prevents rate-limiting (same pattern as `fill-top100-playlist.mjs`).

---

## Preview URL Resolution

1. Check `track.preview_url` from the Search API response
2. If null, scrape `https://open.spotify.com/embed/track/{id}` for `"audioPreview":{"url":"…"}` or `"previewUrl":"…"` (same fallback as `fill-top100-playlist.mjs`)
3. If still null → skip the song (log `✗ no preview`)

---

## Song Import (upsert)

Insert into `songs` using Supabase upsert on `spotify_id` with `ignoreDuplicates: true`:

```sql
INSERT INTO songs (spotify_id, title, artist, release_year, preview_url, album_art_url, tags)
VALUES (...)
ON CONFLICT (spotify_id) DO NOTHING
```

When the upsert returns no row (conflict hit), fall back to a SELECT by `spotify_id` to get the existing row's ID. `tags` defaults to `[]`. Existing catalog rows are never overwritten.

---

## Playlist Update

After importing, insert into `playlist_songs`:

```sql
INSERT INTO playlist_songs (playlist_id, song_id) VALUES (...)
ON CONFLICT DO NOTHING
```

Uses ignore-on-conflict so re-runs don't duplicate entries.

---

## Idempotency

Re-running is safe:
- Playlist is looked up by name; if it exists, it is reused (not re-created)
- Songs already in the playlist are detected upfront (step 3) and skipped
- `upsert ON CONFLICT DO NOTHING` on `songs` prevents duplicate catalog rows
- `INSERT ON CONFLICT DO NOTHING` on `playlist_songs` prevents duplicate membership rows

---

## Reference Song List

~180 songs spanning 2000–2025, targeting ~150 with available preview URLs. Drawn from Billboard Hot 100 year-end charts, Spotify all-time streaming rankings, and cultural impact. Coverage by era:

| Era | Count | Sample artists |
|-----|-------|----------------|
| 2000–2004 | ~35 | Eminem, OutKast, Beyoncé, Nelly, Alicia Keys, Coldplay, The White Stripes |
| 2005–2009 | ~35 | Amy Winehouse, Rihanna, Kanye West, Arctic Monkeys, Lady Gaga, T.I. |
| 2010–2014 | ~35 | Adele, Drake, fun., Macklemore, Lorde, Pharrell, Daft Punk |
| 2015–2019 | ~40 | The Weeknd, Ed Sheeran, Billie Eilish, Post Malone, Luis Fonsi, Lil Nas X |
| 2020–2025 | ~35 | Olivia Rodrigo, Dua Lipa, Harry Styles, Bad Bunny, SZA, Taylor Swift |

---

## Output Format

```
Looking up "Top 2000s and Now" playlist... not found. Creating it.
Loading catalog... 539 songs.

Processing 180 reference songs...

✓ imported     Crazy in Love — Beyoncé  (spotify:track:0TwBtDAWpkpM3srywFVOV5)
✓ imported     In Da Club — 50 Cent  (spotify:track:7iL6o9tox1zgHpKUfh9vuC)
✓ from catalog Bad Guy — Billie Eilish
✓ already      Anti-Hero — Taylor Swift
✗ no preview   Some Song — Some Artist
✗ not found    Another Song — Another Artist
...

─────────────────────────────────────────
Already in playlist:      3
Added from catalog:      12
Imported from Spotify:  135
Skipped (no preview):    18
Not found on Spotify:     7
Errors:                   0
─────────────────────────────────────────
"Top 2000s and Now" playlist now has 150 songs.
Edit it at: /admin/playlists/<uuid>
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
node scripts/fill-2000s-playlist.mjs
```

Safe to re-run at any time. If the playlist already exists and is fully populated, the script will log `✓ already` for each song and exit cleanly.

---

## Affected Files

| File | Action |
|------|--------|
| `scripts/fill-2000s-playlist.mjs` | New — create + fill script |

No changes to web app routes, components, or the data model.

---

## Out of Scope

- Selecting a non-top Spotify search result
- Manual review step before import
- Removing wrong matches (use the admin playlist editor at `/admin/playlists/[id]`)
- Dynamically fetching the song list from Spotify Charts
- Weighted ranking or popularity scoring within the playlist
