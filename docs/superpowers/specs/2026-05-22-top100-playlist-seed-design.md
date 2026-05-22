# Top 100 Playlist Seed — Design Spec

**Date:** 2026-05-22
**Status:** Approved

## Overview

A one-time Node.js script that reads every song from the Supabase catalog, matches them against an embedded reference list of ~120 iconic all-time songs, and creates a playlist named "Top 100" populated with up to 100 matched songs. No changes to the web app itself.

---

## Deliverable

Single file: `scripts/seed-top100-playlist.mjs`

Follows the existing `.mjs` convention (ES modules, loads `.env.local` manually, uses the Supabase REST API via `fetch`).

---

## Script Steps

1. Load `.env.local` to get `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Query all rows from the `songs` table
3. Idempotency check: abort if a playlist named "Top 100" already exists
4. Match catalog songs against the embedded reference list using normalized comparison
5. Take up to the first 100 matched songs (in reference list order)
6. `INSERT` a new row into `playlists` (`name = "Top 100"`, empty description)
7. `INSERT` matched song IDs into `playlist_songs`
8. Print a summary report

---

## Matching Logic

Both the reference entry and the catalog song are independently normalized before comparison:

- Lowercase
- Strip parentheticals: `(feat. X)`, `(ft. X)`, `(Radio Edit)`, `(Remaster)`, `(Live)`, etc.
- Remove punctuation: `'`, `'`, `-`, `.`, `,`
- Normalize `&` → `and`
- Strip leading `the ` from artist names
- Collapse multiple spaces

A catalog song matches a reference entry when both its normalized `title` equals the reference `title` AND its normalized `artist` equals the reference `artist`.

---

## Reference Song List

~120 entries spanning the 1950s–2020s, drawn from Rolling Stone's 500 Greatest Songs and Billboard Hot 100 all-time rankings. Includes rock, pop, soul, hip-hop, and electronic across all eras. The script takes the first 100 catalog matches in list order.

Sample entries (title — artist):
- Like a Rolling Stone — Bob Dylan
- Respect — Aretha Franklin
- Johnny B. Goode — Chuck Berry
- What's Going On — Marvin Gaye
- Imagine — John Lennon
- Superstition — Stevie Wonder
- Bohemian Rhapsody — Queen
- Hotel California — Eagles
- Billie Jean — Michael Jackson
- Smells Like Teen Spirit — Nirvana
- Purple Rain — Prince
- Born to Run — Bruce Springsteen
- Hey Jude — The Beatles
- Blinding Lights — The Weeknd
- Shape of You — Ed Sheeran
- …and ~105 more

---

## Output Format

```
Reading catalog... 247 songs found.
Matching against reference list...

✓  Bohemian Rhapsody — Queen
✓  Smells Like Teen Spirit — Nirvana
✗  Like a Rolling Stone — Bob Dylan  (not in catalog)
...

Matched 73 of 120 reference songs.
Playlist "Top 100" created with 73 songs.
Playlist ID: <uuid>

Edit it at: /admin/playlists/<uuid>
```

---

## How to Run

```bash
node scripts/seed-top100-playlist.mjs
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

After running, open the admin playlist editor at the printed URL to manually review matches and add any songs that weren't auto-matched.

---

## Idempotency

If a playlist named "Top 100" already exists, the script prints an error and exits without inserting anything.

---

## Affected Files

| File | Action |
|------|--------|
| `scripts/seed-top100-playlist.mjs` | New — one-time seed script |

No changes to app routes, components, or the data model.

---

## Out of Scope

- Updating an existing "Top 100" playlist (idempotency guard prevents re-runs)
- Fetching songs from Spotify to populate the catalog (use existing bulk import flow)
- A reusable admin UI for this operation
- Weighted ranking or popularity scoring within the playlist
