// Creates and fills the "Top 2000s and Now" playlist with ~150 songs from 2000–2025,
// importing missing ones from Spotify.
// Run: node scripts/fill-2000s-playlist.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env loading (same pattern as fill-top100-playlist.mjs)
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
// Reference list: ~180 songs from 2000–2025 (Billboard + streaming all-time)
// ---------------------------------------------------------------------------
const REFERENCE = [
  // 2000–2004
  { title: "Hey Ya!", artist: "OutKast" },
  { title: "Ms. Jackson", artist: "OutKast" },
  { title: "The Way You Move", artist: "OutKast" },
  { title: "Without Me", artist: "Eminem" },
  { title: "Lose Yourself", artist: "Eminem" },
  { title: "Stan", artist: "Eminem" },
  { title: "Crazy in Love", artist: "Beyonce" },
  { title: "Baby Boy", artist: "Beyonce" },
  { title: "Fallin'", artist: "Alicia Keys" },
  { title: "If I Ain't Got You", artist: "Alicia Keys" },
  { title: "Hot in Herre", artist: "Nelly" },
  { title: "Dilemma", artist: "Nelly" },
  { title: "In Da Club", artist: "50 Cent" },
  { title: "Yeah!", artist: "Usher" },
  { title: "Burn", artist: "Usher" },
  { title: "Yellow", artist: "Coldplay" },
  { title: "The Scientist", artist: "Coldplay" },
  { title: "Clocks", artist: "Coldplay" },
  { title: "Seven Nation Army", artist: "The White Stripes" },
  { title: "Cry Me a River", artist: "Justin Timberlake" },
  { title: "Rock Your Body", artist: "Justin Timberlake" },
  { title: "Work It", artist: "Missy Elliott" },
  { title: "Get Ur Freak On", artist: "Missy Elliott" },
  { title: "Don't Know Why", artist: "Norah Jones" },
  { title: "Complicated", artist: "Avril Lavigne" },
  { title: "Sk8er Boi", artist: "Avril Lavigne" },
  { title: "Where Is the Love?", artist: "Black Eyed Peas" },
  { title: "In the End", artist: "Linkin Park" },
  { title: "Numb", artist: "Linkin Park" },
  { title: "Beautiful", artist: "Christina Aguilera" },
  { title: "Since U Been Gone", artist: "Kelly Clarkson" },
  { title: "99 Problems", artist: "Jay-Z" },
  { title: "Izzo (H.O.V.A.)", artist: "Jay-Z" },
  { title: "Bootylicious", artist: "Destiny's Child" },
  { title: "Survivor", artist: "Destiny's Child" },
  // 2005–2009
  { title: "Rehab", artist: "Amy Winehouse" },
  { title: "Back to Black", artist: "Amy Winehouse" },
  { title: "Umbrella", artist: "Rihanna" },
  { title: "We Found Love", artist: "Rihanna" },
  { title: "SOS", artist: "Rihanna" },
  { title: "Disturbia", artist: "Rihanna" },
  { title: "Gold Digger", artist: "Kanye West" },
  { title: "Stronger", artist: "Kanye West" },
  { title: "Heartless", artist: "Kanye West" },
  { title: "Just Dance", artist: "Lady Gaga" },
  { title: "Poker Face", artist: "Lady Gaga" },
  { title: "Bad Romance", artist: "Lady Gaga" },
  { title: "Love Story", artist: "Taylor Swift" },
  { title: "You Belong with Me", artist: "Taylor Swift" },
  { title: "Single Ladies", artist: "Beyonce" },
  { title: "Irreplaceable", artist: "Beyonce" },
  { title: "Halo", artist: "Beyonce" },
  { title: "Boom Boom Pow", artist: "Black Eyed Peas" },
  { title: "I Gotta Feeling", artist: "Black Eyed Peas" },
  { title: "Low", artist: "Flo Rida" },
  { title: "Right Round", artist: "Flo Rida" },
  { title: "I Kissed a Girl", artist: "Katy Perry" },
  { title: "Hot N Cold", artist: "Katy Perry" },
  { title: "Lollipop", artist: "Lil Wayne" },
  { title: "Whatever You Like", artist: "T.I." },
  { title: "Live Your Life", artist: "T.I." },
  { title: "Forever", artist: "Chris Brown" },
  { title: "So Sick", artist: "Ne-Yo" },
  { title: "Closer", artist: "Ne-Yo" },
  { title: "Beautiful Girls", artist: "Sean Kingston" },
  { title: "I'm Yours", artist: "Jason Mraz" },
  { title: "Viva la Vida", artist: "Coldplay" },
  { title: "Crank That", artist: "Soulja Boy Tell'em" },
  { title: "Take a Bow", artist: "Rihanna" },
  { title: "No Air", artist: "Jordin Sparks" },
  // 2010–2014
  { title: "Rolling in the Deep", artist: "Adele" },
  { title: "Someone Like You", artist: "Adele" },
  { title: "Skyfall", artist: "Adele" },
  { title: "Take Care", artist: "Drake" },
  { title: "Hold On We're Going Home", artist: "Drake" },
  { title: "Started From the Bottom", artist: "Drake" },
  { title: "We Are Young", artist: "fun." },
  { title: "Thrift Shop", artist: "Macklemore & Ryan Lewis" },
  { title: "Can't Hold Us", artist: "Macklemore & Ryan Lewis" },
  { title: "Royals", artist: "Lorde" },
  { title: "Happy", artist: "Pharrell Williams" },
  { title: "Get Lucky", artist: "Daft Punk" },
  { title: "Somebody That I Used to Know", artist: "Gotye" },
  { title: "Call Me Maybe", artist: "Carly Rae Jepsen" },
  { title: "Party Rock Anthem", artist: "LMFAO" },
  { title: "Moves Like Jagger", artist: "Maroon 5" },
  { title: "Animals", artist: "Maroon 5" },
  { title: "Blurred Lines", artist: "Robin Thicke" },
  { title: "Dark Horse", artist: "Katy Perry" },
  { title: "Roar", artist: "Katy Perry" },
  { title: "Firework", artist: "Katy Perry" },
  { title: "Shake It Off", artist: "Taylor Swift" },
  { title: "Blank Space", artist: "Taylor Swift" },
  { title: "Baby", artist: "Justin Bieber" },
  { title: "What Makes You Beautiful", artist: "One Direction" },
  { title: "The A Team", artist: "Ed Sheeran" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran" },
  { title: "Radioactive", artist: "Imagine Dragons" },
  { title: "Demons", artist: "Imagine Dragons" },
  { title: "Stay With Me", artist: "Sam Smith" },
  { title: "Chandelier", artist: "Sia" },
  { title: "Elastic Heart", artist: "Sia" },
  { title: "Swimming Pools", artist: "Kendrick Lamar" },
  { title: "m.A.A.d city", artist: "Kendrick Lamar" },
  // 2015–2019
  { title: "Can't Feel My Face", artist: "The Weeknd" },
  { title: "Starboy", artist: "The Weeknd" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Perfect", artist: "Ed Sheeran" },
  { title: "Castle on the Hill", artist: "Ed Sheeran" },
  { title: "Bad Guy", artist: "Billie Eilish" },
  { title: "Ocean Eyes", artist: "Billie Eilish" },
  { title: "Rockstar", artist: "Post Malone" },
  { title: "Circles", artist: "Post Malone" },
  { title: "Better Now", artist: "Post Malone" },
  { title: "Sunflower", artist: "Post Malone" },
  { title: "Despacito", artist: "Luis Fonsi" },
  { title: "Old Town Road", artist: "Lil Nas X" },
  { title: "God's Plan", artist: "Drake" },
  { title: "Hotline Bling", artist: "Drake" },
  { title: "One Dance", artist: "Drake" },
  { title: "In My Feelings", artist: "Drake" },
  { title: "HUMBLE.", artist: "Kendrick Lamar" },
  { title: "DNA.", artist: "Kendrick Lamar" },
  { title: "Bodak Yellow", artist: "Cardi B" },
  { title: "Thank U Next", artist: "Ariana Grande" },
  { title: "7 Rings", artist: "Ariana Grande" },
  { title: "Into You", artist: "Ariana Grande" },
  { title: "Sorry", artist: "Justin Bieber" },
  { title: "Love Yourself", artist: "Justin Bieber" },
  { title: "What Do You Mean?", artist: "Justin Bieber" },
  { title: "Stressed Out", artist: "Twenty One Pilots" },
  { title: "Heathens", artist: "Twenty One Pilots" },
  { title: "24K Magic", artist: "Bruno Mars" },
  { title: "That's What I Like", artist: "Bruno Mars" },
  { title: "Truth Hurts", artist: "Lizzo" },
  { title: "Good as Hell", artist: "Lizzo" },
  { title: "This Is America", artist: "Childish Gambino" },
  { title: "Señorita", artist: "Shawn Mendes" },
  { title: "Havana", artist: "Camila Cabello" },
  { title: "Lucid Dreams", artist: "Juice WRLD" },
  { title: "Congratulations", artist: "Post Malone" },
  { title: "Location", artist: "Khalid" },
  { title: "Young, Dumb & Broke", artist: "Khalid" },
  // 2020–2025
  { title: "drivers license", artist: "Olivia Rodrigo" },
  { title: "good 4 u", artist: "Olivia Rodrigo" },
  { title: "brutal", artist: "Olivia Rodrigo" },
  { title: "vampire", artist: "Olivia Rodrigo" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Don't Start Now", artist: "Dua Lipa" },
  { title: "Physical", artist: "Dua Lipa" },
  { title: "Watermelon Sugar", artist: "Harry Styles" },
  { title: "As It Was", artist: "Harry Styles" },
  { title: "Adore You", artist: "Harry Styles" },
  { title: "Dakiti", artist: "Bad Bunny" },
  { title: "Titi Me Pregunto", artist: "Bad Bunny" },
  { title: "Me Porto Bonito", artist: "Bad Bunny" },
  { title: "Kill Bill", artist: "SZA" },
  { title: "Shirt", artist: "SZA" },
  { title: "Anti-Hero", artist: "Taylor Swift" },
  { title: "All Too Well", artist: "Taylor Swift" },
  { title: "Heat Waves", artist: "Glass Animals" },
  { title: "Say So", artist: "Doja Cat" },
  { title: "Kiss Me More", artist: "Doja Cat" },
  { title: "INDUSTRY BABY", artist: "Lil Nas X" },
  { title: "MONTERO", artist: "Lil Nas X" },
  { title: "Stay", artist: "The Kid LAROI" },
  { title: "Easy On Me", artist: "Adele" },
  { title: "Bad Habits", artist: "Ed Sheeran" },
  { title: "Peaches", artist: "Justin Bieber" },
  { title: "Butter", artist: "BTS" },
  { title: "Dynamite", artist: "BTS" },
  { title: "Leave the Door Open", artist: "Silk Sonic" },
  { title: "Flowers", artist: "Miley Cyrus" },
  { title: "Espresso", artist: "Sabrina Carpenter" },
  { title: "Please Please Please", artist: "Sabrina Carpenter" },
  { title: "Good Luck, Babe!", artist: "Chappell Roan" },
  { title: "Beautiful Things", artist: "Benson Boone" },
  { title: "Stick Season", artist: "Noah Kahan" },
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
  // 1. Look up or create the "Top 2000s and Now" playlist
  let { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id")
    .eq("name", "Top 2000s and Now")
    .maybeSingle();
  if (playlistError) {
    console.error("Failed to look up playlist:", playlistError.message);
    process.exit(1);
  }
  if (!playlist) {
    console.log('Looking up "Top 2000s and Now" playlist... not found. Creating it.');
    const { data: created, error: createError } = await supabase
      .from("playlists")
      .insert({ name: "Top 2000s and Now", description: "" })
      .select("id")
      .single();
    if (createError) {
      console.error("Failed to create playlist:", createError.message);
      process.exit(1);
    }
    playlist = created;
  } else {
    console.log('Looking up "Top 2000s and Now" playlist... found.');
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
  console.log(`(${playlistSongIds.size} songs already in it).`);

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
        countErrors++;
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
      // Row already existed (ignoreDuplicates returned nothing) — fetch it
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
  console.log(`"Top 2000s and Now" playlist now has ${playlistSongIds.size} songs.`);
  console.log(`Edit it at: /admin/playlists/${playlist.id}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
