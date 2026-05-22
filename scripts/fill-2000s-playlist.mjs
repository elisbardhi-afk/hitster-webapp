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
