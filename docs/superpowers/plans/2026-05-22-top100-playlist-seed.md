# Top 100 Playlist Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/seed-top100-playlist.mjs` — a one-time script that reads the Supabase song catalog, matches songs against an embedded ~120-entry reference list of all-time iconic songs using normalized title+artist comparison, and creates a "Top 100" playlist populated with up to 100 matched songs.

**Architecture:** Single `.mjs` ES module script following the pattern of the existing `scripts/fetch-top-songs.mjs`. Loads `.env.local` manually, imports `@supabase/supabase-js` directly, and hits the Supabase DB using the service role key. No changes to the web app.

**Tech Stack:** Node.js (ES modules / `.mjs`), `@supabase/supabase-js` (already installed), `.env.local` for credentials.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `scripts/seed-top100-playlist.mjs` | Full seed script: env loading, catalog fetch, matching, playlist creation |

No other files are created or modified.

---

### Task 1: Write the normalize helper and verify it manually

**Files:**
- Create: `scripts/seed-top100-playlist.mjs`

- [ ] **Step 1: Create the script file with just the normalize function**

Create `scripts/seed-top100-playlist.mjs` with the following content:

```js
// One-time seed: creates a "Top 100" playlist from the song catalog.
// Run: node scripts/seed-top100-playlist.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env loading (same pattern as fetch-top-songs.mjs)
// ---------------------------------------------------------------------------
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

// ---------------------------------------------------------------------------
// Normalize: lowercase, strip parens, remove punctuation, & → and, no "the "
// ---------------------------------------------------------------------------
export function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")   // strip (feat. X), (Remaster), etc.
    .replace(/['''\-.,!?]/g, "") // remove common punctuation
    .replace(/\b&\b/g, "and")    // & → and
    .replace(/\bthe\b/g, "")     // strip standalone "the"
    .replace(/\s+/g, " ")        // collapse whitespace
    .trim();
}
```

- [ ] **Step 2: Smoke-test the normalize function**

Run:
```bash
node --input-type=module <<'EOF'
import { normalize } from "./scripts/seed-top100-playlist.mjs";
console.assert(normalize("Bohemian Rhapsody") === "bohemian rhapsody", "basic lowercase failed");
console.assert(normalize("The Beatles") === "beatles", "the-strip failed");
console.assert(normalize("Sign 'O' the Times") === "sign o times", "punctuation failed");
console.assert(normalize("Smells Like Teen Spirit (Remaster)") === "smells like teen spirit", "parens failed");
console.assert(normalize("Simon & Garfunkel") === "simon and garfunkel", "ampersand failed");
console.log("All normalize checks passed.");
EOF
```

Expected output:
```
All normalize checks passed.
```

---

### Task 2: Add the reference list and Supabase client setup

**Files:**
- Modify: `scripts/seed-top100-playlist.mjs`

- [ ] **Step 1: Append the Supabase client block and reference list**

Append the following to `scripts/seed-top100-playlist.mjs` after the `normalize` function:

```js
// ---------------------------------------------------------------------------
// Supabase client (service role — needed for inserts without auth)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Reference list: ~120 all-time iconic songs (Rolling Stone + Billboard)
// The script picks the first 100 that exist in the catalog.
// ---------------------------------------------------------------------------
const REFERENCE = [
  // 1950s / Early Rock & Roll
  { title: "Johnny B. Goode", artist: "Chuck Berry" },
  { title: "Maybelline", artist: "Chuck Berry" },
  { title: "Hound Dog", artist: "Elvis Presley" },
  { title: "Jailhouse Rock", artist: "Elvis Presley" },
  { title: "Suspicious Minds", artist: "Elvis Presley" },
  { title: "Great Balls of Fire", artist: "Jerry Lee Lewis" },
  { title: "Tutti Frutti", artist: "Little Richard" },
  { title: "Blueberry Hill", artist: "Fats Domino" },
  { title: "Rock Around the Clock", artist: "Bill Haley & His Comets" },
  // 1960s Soul & R&B
  { title: "Respect", artist: "Aretha Franklin" },
  { title: "A Change Is Gonna Come", artist: "Sam Cooke" },
  { title: "What's Going On", artist: "Marvin Gaye" },
  { title: "I Heard It Through the Grapevine", artist: "Marvin Gaye" },
  { title: "Let's Get It On", artist: "Marvin Gaye" },
  { title: "My Girl", artist: "The Temptations" },
  { title: "Stand By Me", artist: "Ben E. King" },
  { title: "Dancing in the Street", artist: "Martha Reeves & the Vandellas" },
  { title: "Baby Love", artist: "The Supremes" },
  { title: "Stop! In the Name of Love", artist: "The Supremes" },
  { title: "Good Vibrations", artist: "The Beach Boys" },
  // 1960s Rock & Pop
  { title: "Like a Rolling Stone", artist: "Bob Dylan" },
  { title: "Blowin' in the Wind", artist: "Bob Dylan" },
  { title: "Hey Jude", artist: "The Beatles" },
  { title: "Let It Be", artist: "The Beatles" },
  { title: "Come Together", artist: "The Beatles" },
  { title: "Yesterday", artist: "The Beatles" },
  { title: "I Want to Hold Your Hand", artist: "The Beatles" },
  { title: "Strawberry Fields Forever", artist: "The Beatles" },
  { title: "Help!", artist: "The Beatles" },
  { title: "Satisfaction", artist: "The Rolling Stones" },
  { title: "Gimme Shelter", artist: "The Rolling Stones" },
  { title: "Paint It Black", artist: "The Rolling Stones" },
  { title: "Brown Sugar", artist: "The Rolling Stones" },
  // 1970s Rock
  { title: "Imagine", artist: "John Lennon" },
  { title: "Born to Run", artist: "Bruce Springsteen" },
  { title: "Thunder Road", artist: "Bruce Springsteen" },
  { title: "Bohemian Rhapsody", artist: "Queen" },
  { title: "We Are the Champions", artist: "Queen" },
  { title: "We Will Rock You", artist: "Queen" },
  { title: "Don't Stop Me Now", artist: "Queen" },
  { title: "Killer Queen", artist: "Queen" },
  { title: "Hotel California", artist: "Eagles" },
  { title: "Life in the Fast Lane", artist: "Eagles" },
  { title: "Desperado", artist: "Eagles" },
  { title: "Whole Lotta Love", artist: "Led Zeppelin" },
  { title: "Stairway to Heaven", artist: "Led Zeppelin" },
  { title: "Black Dog", artist: "Led Zeppelin" },
  { title: "Kashmir", artist: "Led Zeppelin" },
  { title: "Space Oddity", artist: "David Bowie" },
  { title: "Heroes", artist: "David Bowie" },
  { title: "Life on Mars?", artist: "David Bowie" },
  { title: "Ziggy Stardust", artist: "David Bowie" },
  { title: "Superstition", artist: "Stevie Wonder" },
  { title: "Sir Duke", artist: "Stevie Wonder" },
  { title: "Higher Ground", artist: "Stevie Wonder" },
  { title: "Purple Rain", artist: "Prince" },
  { title: "When Doves Cry", artist: "Prince" },
  { title: "Kiss", artist: "Prince" },
  { title: "Little Red Corvette", artist: "Prince" },
  { title: "Your Song", artist: "Elton John" },
  { title: "Rocket Man", artist: "Elton John" },
  { title: "Tiny Dancer", artist: "Elton John" },
  { title: "Crocodile Rock", artist: "Elton John" },
  { title: "Brown Eyed Girl", artist: "Van Morrison" },
  // 1980s
  { title: "Billie Jean", artist: "Michael Jackson" },
  { title: "Thriller", artist: "Michael Jackson" },
  { title: "Beat It", artist: "Michael Jackson" },
  { title: "Man in the Mirror", artist: "Michael Jackson" },
  { title: "Let's Dance", artist: "David Bowie" },
  { title: "Every Breath You Take", artist: "The Police" },
  { title: "Roxanne", artist: "The Police" },
  { title: "Message in a Bottle", artist: "The Police" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
  { title: "November Rain", artist: "Guns N' Roses" },
  { title: "Welcome to the Jungle", artist: "Guns N' Roses" },
  { title: "Paradise City", artist: "Guns N' Roses" },
  { title: "Like a Prayer", artist: "Madonna" },
  { title: "Material Girl", artist: "Madonna" },
  { title: "Like a Virgin", artist: "Madonna" },
  { title: "Vogue", artist: "Madonna" },
  { title: "Jump", artist: "Van Halen" },
  { title: "Don't Stop Believin'", artist: "Journey" },
  { title: "Africa", artist: "Toto" },
  { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper" },
  { title: "Take On Me", artist: "a-ha" },
  { title: "Don't You (Forget About Me)", artist: "Simple Minds" },
  { title: "Eye of the Tiger", artist: "Survivor" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi" },
  { title: "You Give Love a Bad Name", artist: "Bon Jovi" },
  { title: "With or Without You", artist: "U2" },
  { title: "One", artist: "U2" },
  { title: "Where the Streets Have No Name", artist: "U2" },
  { title: "Sunday Bloody Sunday", artist: "U2" },
  // 1990s
  { title: "Smells Like Teen Spirit", artist: "Nirvana" },
  { title: "Come as You Are", artist: "Nirvana" },
  { title: "Losing My Religion", artist: "R.E.M." },
  { title: "Everybody Hurts", artist: "R.E.M." },
  { title: "Creep", artist: "Radiohead" },
  { title: "Karma Police", artist: "Radiohead" },
  { title: "Jeremy", artist: "Pearl Jam" },
  { title: "Black", artist: "Pearl Jam" },
  { title: "Enter Sandman", artist: "Metallica" },
  { title: "One", artist: "Metallica" },
  { title: "I Will Always Love You", artist: "Whitney Houston" },
  { title: "I Wanna Dance with Somebody", artist: "Whitney Houston" },
  { title: "End of the Road", artist: "Boyz II Men" },
  { title: "Waterfalls", artist: "TLC" },
  { title: "No Scrubs", artist: "TLC" },
  { title: "Killing Me Softly", artist: "Fugees" },
  { title: "Mo Money Mo Problems", artist: "The Notorious B.I.G." },
  { title: "California Love", artist: "2Pac" },
  { title: "Changes", artist: "2Pac" },
  { title: "99 Problems", artist: "Jay-Z" },
  // 2000s
  { title: "Lose Yourself", artist: "Eminem" },
  { title: "Stan", artist: "Eminem" },
  { title: "In Da Club", artist: "50 Cent" },
  { title: "Yeah!", artist: "Usher" },
  { title: "Crazy in Love", artist: "Beyonce" },
  { title: "Single Ladies", artist: "Beyonce" },
  { title: "Irreplaceable", artist: "Beyonce" },
  { title: "Umbrella", artist: "Rihanna" },
  { title: "We Found Love", artist: "Rihanna" },
  { title: "Rehab", artist: "Amy Winehouse" },
  { title: "Back to Black", artist: "Amy Winehouse" },
  { title: "Rolling in the Deep", artist: "Adele" },
  { title: "Someone Like You", artist: "Adele" },
  { title: "Hello", artist: "Adele" },
  { title: "Bad Romance", artist: "Lady Gaga" },
  { title: "Poker Face", artist: "Lady Gaga" },
  // 2010s–2020s
  { title: "Uptown Funk", artist: "Mark Ronson" },
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran" },
  { title: "Shake It Off", artist: "Taylor Swift" },
  { title: "Blank Space", artist: "Taylor Swift" },
  { title: "Anti-Hero", artist: "Taylor Swift" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Save Your Tears", artist: "The Weeknd" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Don't Start Now", artist: "Dua Lipa" },
  { title: "Bad Guy", artist: "Billie Eilish" },
  { title: "Hotline Bling", artist: "Drake" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Stronger", artist: "Kanye West" },
  { title: "Gold Digger", artist: "Kanye West" },
  { title: "Old Town Road", artist: "Lil Nas X" },
  { title: "Rockstar", artist: "Post Malone" },
  { title: "Circles", artist: "Post Malone" },
  { title: "Roar", artist: "Katy Perry" },
  { title: "Firework", artist: "Katy Perry" },
];
```

- [ ] **Step 2: Verify the file parses without errors**

Run:
```bash
node --check scripts/seed-top100-playlist.mjs
```

Expected: no output (exit code 0).

---

### Task 3: Write the main function and wire everything together

**Files:**
- Modify: `scripts/seed-top100-playlist.mjs`

- [ ] **Step 1: Append the main function**

Append the following to the end of `scripts/seed-top100-playlist.mjs`:

```js
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // 1. Read catalog
  const { data: songs, error: songsError } = await supabase
    .from("songs")
    .select("id, title, artist");
  if (songsError) {
    console.error("Failed to read catalog:", songsError.message);
    process.exit(1);
  }
  console.log(`Reading catalog... ${songs.length} songs found.`);

  // 2. Idempotency check
  const { data: existing } = await supabase
    .from("playlists")
    .select("id")
    .eq("name", "Top 100")
    .maybeSingle();
  if (existing) {
    console.error(
      'A playlist named "Top 100" already exists. Aborting.\n' +
        `Edit it at: /admin/playlists/${existing.id}`
    );
    process.exit(1);
  }

  // 3. Build catalog lookup: normalizedKey → song
  const catalogMap = new Map();
  for (const song of songs) {
    const key = `${normalize(song.title)}||${normalize(song.artist)}`;
    catalogMap.set(key, song);
  }

  // 4. Match reference list against catalog (max 100)
  console.log("\nMatching against reference list...\n");
  const matchedIds = [];
  for (const ref of REFERENCE) {
    if (matchedIds.length >= 100) break;
    const key = `${normalize(ref.title)}||${normalize(ref.artist)}`;
    const song = catalogMap.get(key);
    if (song) {
      console.log(`✓  ${ref.title} — ${ref.artist}`);
      matchedIds.push(song.id);
    } else {
      console.log(`✗  ${ref.title} — ${ref.artist}  (not in catalog)`);
    }
  }

  // 5. Create the playlist
  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .insert({ name: "Top 100", description: "" })
    .select("id")
    .single();
  if (playlistError) {
    console.error("Failed to create playlist:", playlistError.message);
    process.exit(1);
  }

  // 6. Insert matched songs
  if (matchedIds.length > 0) {
    const { error: insertError } = await supabase
      .from("playlist_songs")
      .insert(matchedIds.map((song_id) => ({ playlist_id: playlist.id, song_id })));
    if (insertError) {
      console.error("Failed to insert songs:", insertError.message);
      process.exit(1);
    }
  }

  // 7. Summary
  console.log(`\nMatched ${matchedIds.length} of ${REFERENCE.length} reference songs.`);
  console.log(`Playlist "Top 100" created with ${matchedIds.length} songs.`);
  console.log(`Playlist ID: ${playlist.id}`);
  console.log(`\nEdit it at: /admin/playlists/${playlist.id}`);
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the full file parses cleanly**

Run:
```bash
node --check scripts/seed-top100-playlist.mjs
```

Expected: no output (exit code 0).

---

### Task 4: Run the script and verify the playlist

**Files:**
- No file changes — execution only.

- [ ] **Step 1: Run the seed script**

```bash
node scripts/seed-top100-playlist.mjs
```

Expected output shape:
```
Reading catalog... <N> songs found.

Matching against reference list...

✓  Johnny B. Goode — Chuck Berry
✗  Maybelline — Chuck Berry  (not in catalog)
...

Matched <M> of 155 reference songs.
Playlist "Top 100" created with <M> songs.
Playlist ID: <uuid>

Edit it at: /admin/playlists/<uuid>
```

If you see `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local`, ensure `.env.local` is present in the project root with those keys set.

If you see `A playlist named "Top 100" already exists`, the script has already been run — open the printed URL to edit it.

- [ ] **Step 2: Open the admin playlist editor and confirm songs appear**

Navigate to `/admin/playlists` in the running dev server (`npm run dev`). Confirm:
- A playlist named "Top 100" appears in the list
- Its song count matches what the script reported
- Clicking "Edit" shows the correct songs checked in the `PlaylistSongsEditor`

- [ ] **Step 3: Commit the script**

```bash
git add scripts/seed-top100-playlist.mjs
git commit -m "feat: add seed script for Top 100 playlist"
```

---

## Self-Review

**Spec coverage:**
- ✅ Loads `.env.local` (Task 1)
- ✅ Reads songs from catalog (Task 3, step main fn point 1)
- ✅ Matches against ~120-entry reference list (Task 2 + Task 3)
- ✅ Normalization: lowercase, strip parens, punctuation, `&`→`and`, `the` (Task 1)
- ✅ Takes first 100 matches in reference order (Task 3, `matchedIds.length >= 100` guard)
- ✅ Idempotency check (Task 3, step 2)
- ✅ Creates "Top 100" playlist row (Task 3, step 5)
- ✅ Inserts into `playlist_songs` (Task 3, step 6)
- ✅ Prints summary with matched/unmatched counts and edit URL (Task 3, step 7)
- ✅ No web app changes (single script file only)

**Placeholder scan:** No TBDs or "implement later" items. Every step contains complete code.

**Type consistency:** `normalize()` is defined once in Task 1 and used identically in Task 3. The `REFERENCE` array uses `{ title, artist }` consistently with the `ref.title`/`ref.artist` usage in `main()`. Supabase `songs` select includes `id, title, artist` — exactly the fields used in the map.

**Edge cases covered:**
- Zero matches → playlist created with 0 songs (valid, editable in admin UI)
- Catalog has duplicate normalized keys → last one wins in the Map; acceptable for a seed script
- `matchedIds.length >= 100` guard prevents overflow even if reference list grows
