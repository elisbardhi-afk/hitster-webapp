import { getServerClient } from "./supabase";

export type Playlist = {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  created_at: string;
  song_count: number;
};

type PlaylistRow = Omit<Playlist, "song_count"> & {
  playlist_songs: { song_id: string }[];
};

function rowToPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cover_image_url: row.cover_image_url,
    created_at: row.created_at,
    song_count: row.playlist_songs.length,
  };
}

export async function listPlaylists(): Promise<Playlist[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("playlists")
    .select("*, playlist_songs(song_id)")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as PlaylistRow[]).map(rowToPlaylist);
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("playlists")
    .select("*, playlist_songs(song_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPlaylist(data as PlaylistRow);
}

export async function createPlaylist(opts: {
  name: string;
  description: string;
  cover_image_url: string | null;
}): Promise<Playlist> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("playlists")
    .insert({
      name: opts.name,
      description: opts.description,
      cover_image_url: opts.cover_image_url,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Omit<Playlist, "song_count">), song_count: 0 };
}

export async function updatePlaylist(
  id: string,
  opts: { name: string; description: string; cover_image_url: string | null }
): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase
    .from("playlists")
    .update(opts)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePlaylist(id: string): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPlaylistSongIds(playlistId: string): Promise<string[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("playlist_songs")
    .select("song_id")
    .eq("playlist_id", playlistId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.song_id as string);
}

export async function setPlaylistSongs(
  playlistId: string,
  songIds: string[]
): Promise<void> {
  const supabase = getServerClient();
  const { error: delError } = await supabase
    .from("playlist_songs")
    .delete()
    .eq("playlist_id", playlistId);
  if (delError) throw new Error(delError.message);
  if (songIds.length === 0) return;
  const { error: insError } = await supabase
    .from("playlist_songs")
    .insert(songIds.map((song_id) => ({ playlist_id: playlistId, song_id })));
  if (insError) throw new Error(insError.message);
}
