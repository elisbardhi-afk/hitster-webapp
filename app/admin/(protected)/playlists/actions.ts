"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  setPlaylistSongs,
} from "@/lib/playlists";

export async function createPlaylistAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cover_image_url =
    String(formData.get("cover_image_url") ?? "").trim() || null;
  if (!name) return;
  const playlist = await createPlaylist({ name, description, cover_image_url });
  redirect(`/admin/playlists/${playlist.id}`);
}

export async function updatePlaylistAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cover_image_url =
    String(formData.get("cover_image_url") ?? "").trim() || null;
  if (!id || !name) return;
  await updatePlaylist(id, { name, description, cover_image_url });
  revalidatePath(`/admin/playlists/${id}`);
  revalidatePath("/admin/playlists");
}

export async function deletePlaylistAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deletePlaylist(id);
  redirect("/admin/playlists");
}

export async function updatePlaylistSongsAction(formData: FormData) {
  const playlistId = String(formData.get("playlistId") ?? "");
  const songIds = formData.getAll("songIds").map(String).filter(Boolean);
  if (!playlistId) return;
  await setPlaylistSongs(playlistId, songIds);
  revalidatePath(`/admin/playlists/${playlistId}`);
  revalidatePath("/admin/playlists");
}
