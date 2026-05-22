// Fills the "Top 100" playlist with all reference songs,
// importing missing ones from Spotify.
// Run: node scripts/fill-top100-playlist.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env loading (same pattern as seed-top100-playlist.mjs)
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
  realtime: { transport: ws },
});

// ---------------------------------------------------------------------------
// Normalize: lowercase, strip parens, remove punctuation, & → and, no "the "
// ---------------------------------------------------------------------------
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/['''\-.,!?]/g, "")
    .replace(/\b&\b/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Reference list — identical to seed-top100-playlist.mjs
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

// ---------------------------------------------------------------------------
// Spotify helpers
// ---------------------------------------------------------------------------

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local"
    );
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Returns the first Spotify track matching title + artist, or null.
async function searchSpotifyTrack(title, artist, token) {
  const q = encodeURIComponent(`track:"${title}" artist:"${artist}"`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    process.stderr.write(`  search API error ${res.status} for "${title}" — skipping\n`);
    return null;
  }
  let data;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  return data.tracks?.items?.[0] ?? null;
}

// Scrapes the Spotify embed page for a preview URL when the API returns null.
async function fetchPreviewFromEmbed(trackId) {
  try {
    const res = await fetch(
      `https://open.spotify.com/embed/track/${trackId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"audioPreview"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
    if (m) {
      try { return decodeURIComponent(m[1].replace(/\\u002F/g, "/")); } catch { return null; }
    }
    const m2 = html.match(/"previewUrl"\s*:\s*"([^"]+)"/);
    if (m2) {
      try { return decodeURIComponent(m2[1].replace(/\\u002F/g, "/")); } catch { return null; }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // 1. Look up the "Top 100" playlist
  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id")
    .eq("name", "Top 100")
    .maybeSingle();
  if (playlistError) {
    console.error("Failed to look up playlist:", playlistError.message);
    process.exit(1);
  }
  if (!playlist) {
    console.error(
      'Playlist "Top 100" not found. Run seed-top100-playlist.mjs first.'
    );
    process.exit(1);
  }

  // 2. Read current playlist song IDs
  const { data: existingRows, error: existingError } = await supabase
    .from("playlist_songs")
    .select("song_id")
    .eq("playlist_id", playlist.id);
  if (existingError) {
    console.error("Failed to read playlist songs:", existingError.message);
    process.exit(1);
  }
  const playlistSongIds = new Set(existingRows.map((r) => r.song_id));
  console.log(
    `Looking up "Top 100" playlist... found (${playlistSongIds.size} songs already in it).`
  );

  // 3. Read full catalog into a normalize-keyed map
  const { data: songs, error: songsError } = await supabase
    .from("songs")
    .select("id, title, artist");
  if (songsError) {
    console.error("Failed to read catalog:", songsError.message);
    process.exit(1);
  }
  const catalogMap = new Map();
  for (const song of songs) {
    catalogMap.set(
      `${normalize(song.title)}||${normalize(song.artist)}`,
      song
    );
  }
  console.log(`Loading catalog... ${songs.length} songs.`);

  // 4. Get Spotify token
  const token = await getSpotifyToken();

  // 5. Process each reference song
  console.log(`\nProcessing ${REFERENCE.length} reference songs...\n`);
  let countAlready = 0;
  let countFromCatalog = 0;
  let countImported = 0;
  let countNoPreview = 0;
  let countNotFound = 0;
  let countErrors = 0;

  for (const ref of REFERENCE) {
    const key = `${normalize(ref.title)}||${normalize(ref.artist)}`;
    const catalogSong = catalogMap.get(key);

    // Already in playlist
    if (catalogSong && playlistSongIds.has(catalogSong.id)) {
      console.log(`✓ already      ${ref.title} — ${ref.artist}`);
      countAlready++;
      continue;
    }

    // In catalog but not yet in playlist
    if (catalogSong) {
      const { error } = await supabase
        .from("playlist_songs")
        .insert({ playlist_id: playlist.id, song_id: catalogSong.id });
      if (error) {
        console.error(`  ✗ error adding ${ref.title}: ${error.message}`);
      } else {
        console.log(`✓ from catalog ${ref.title} — ${ref.artist}`);
        playlistSongIds.add(catalogSong.id);
        countFromCatalog++;
      }
      continue;
    }

    // Not in catalog — search Spotify (rate-limit delay)
    await new Promise((r) => setTimeout(r, 200));
    const track = await searchSpotifyTrack(ref.title, ref.artist, token);
    if (!track) {
      console.log(`✗ not found    ${ref.title} — ${ref.artist}`);
      countNotFound++;
      continue;
    }

    // Resolve preview URL: API first, embed page fallback
    let previewUrl = track.preview_url ?? null;
    if (!previewUrl) previewUrl = await fetchPreviewFromEmbed(track.id);
    if (!previewUrl) {
      console.log(`✗ no preview   ${ref.title} — ${ref.artist}`);
      countNoPreview++;
      continue;
    }

    // Upsert into catalog
    const releaseYear = parseInt(track.album.release_date.slice(0, 4), 10);
    const albumArtUrl =
      track.album.images.find((i) => i.width >= 200)?.url ??
      track.album.images[0]?.url ??
      null;

    const { data: upserted, error: upsertError } = await supabase
      .from("songs")
      .upsert(
        {
          spotify_id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          release_year: releaseYear,
          preview_url: previewUrl,
          album_art_url: albumArtUrl,
          tags: [],
        },
        { onConflict: "spotify_id", ignoreDuplicates: true }
      )
      .select("id")
      .maybeSingle();

    let songId;
    if (upsertError) {
      console.error(`  ✗ import error ${ref.title}: ${upsertError.message}`);
      countErrors++;
      continue;
    } else if (!upserted) {
      // Row already existed (ignoreDuplicates=true returned nothing) — fetch it
      const { data: existing, error: fetchError } = await supabase
        .from("songs")
        .select("id")
        .eq("spotify_id", track.id)
        .single();
      if (fetchError) {
        console.error(`  ✗ fetch error ${ref.title}: ${fetchError.message}`);
        countErrors++;
        continue;
      }
      songId = existing.id;
    } else {
      songId = upserted.id;
    }

    // Add to playlist
    const { error: insertError } = await supabase
      .from("playlist_songs")
      .insert({ playlist_id: playlist.id, song_id: songId });
    if (insertError) {
      console.error(
        `  ✗ playlist insert error ${ref.title}: ${insertError.message}`
      );
      countErrors++;
      continue;
    }

    console.log(
      `✓ imported     ${ref.title} — ${ref.artist}  (spotify:track:${track.id})`
    );
    playlistSongIds.add(songId);
    countImported++;
  }

  // 6. Summary
  const bar = "─".repeat(41);
  console.log(`\n${bar}`);
  console.log(`Already in playlist:   ${String(countAlready).padStart(4)}`);
  console.log(`Added from catalog:    ${String(countFromCatalog).padStart(4)}`);
  console.log(`Imported from Spotify: ${String(countImported).padStart(4)}`);
  console.log(`Skipped (no preview):  ${String(countNoPreview).padStart(4)}`);
  console.log(`Not found on Spotify:  ${String(countNotFound).padStart(4)}`);
  console.log(`Errors:                ${String(countErrors).padStart(4)}`);
  console.log(bar);
  console.log(`"Top 100" playlist now has ${playlistSongIds.size} songs.`);
  console.log(`Edit it at: /admin/playlists/${playlist.id}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
