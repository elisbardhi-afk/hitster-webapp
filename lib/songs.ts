import { getServerClient } from "./supabase";
import { fetchTrack, type SongMetadata } from "./spotify";
import { decadeOf } from "./song-filter";

export type Song = {
  id: string;
  spotify_id: string;
  title: string;
  artist: string;
  release_year: number;
  preview_url: string;
  album_art_url: string | null;
  added_at: string;
  tags: string[];
};

export async function listSongs(): Promise<Song[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("release_year", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Song[];
}

/** Distinct tags across the catalog, sorted alphabetically. */
export async function listTags(): Promise<string[]> {
  const songs = await listSongs();
  const seen = new Set<string>();
  for (const s of songs) {
    for (const t of s.tags ?? []) seen.add(t);
  }
  return Array.from(seen).sort();
}

/** "2015" → "2010s", "1999" → "1990s" */
export { decadeOf } from "./song-filter";

/** Distinct decades present in the catalog, sorted chronologically. */
export async function listDecades(): Promise<string[]> {
  const songs = await listSongs();
  const seen = new Set<string>();
  for (const s of songs) seen.add(decadeOf(s.release_year));
  return Array.from(seen).sort((a, b) => parseInt(a) - parseInt(b));
}

export async function updateSongYear(id: string, releaseYear: number): Promise<Song> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("songs")
    .update({ release_year: releaseYear })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Song;
}

export async function getSong(id: string): Promise<Song | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Song | null) ?? null;
}

export async function getSongBySpotifyId(spotifyId: string): Promise<Song | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("spotify_id", spotifyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Song | null) ?? null;
}

export async function deleteSong(id: string): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertSongFromMetadata(
  meta: SongMetadata,
  tags: string[] = [],
): Promise<Song> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("songs")
    .upsert(
      {
        spotify_id: meta.spotifyId,
        title: meta.title,
        artist: meta.artist,
        release_year: meta.releaseYear,
        preview_url: meta.previewUrl,
        album_art_url: meta.albumArtUrl,
        tags,
      },
      { onConflict: "spotify_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Song;
}

export async function importTrackById(
  trackId: string,
  tags: string[] = [],
): Promise<Song> {
  const meta = await fetchTrack(trackId);
  return upsertSongFromMetadata(meta, tags);
}
