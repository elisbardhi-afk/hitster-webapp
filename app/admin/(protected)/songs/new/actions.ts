"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { extractTrackId } from "@/lib/spotify";
import { importTrackById } from "@/lib/songs";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

export async function addSongAction(formData: FormData) {
  const input = String(formData.get("spotify") ?? "");
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const trackId = extractTrackId(input);
  if (!trackId) {
    redirect(`/admin/songs/new?error=${encodeURIComponent("Could not parse a Spotify track ID from that input")}`);
  }

  try {
    const song = await importTrackById(trackId, tags);
    revalidatePath("/admin");
    revalidatePath("/admin/qr-sheet");
    redirect(`/admin/songs/new?added=${encodeURIComponent(`${song.title} — ${song.artist} (${song.release_year})`)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Import failed";
    if (msg === "NEXT_REDIRECT") throw err;
    redirect(`/admin/songs/new?error=${encodeURIComponent(msg)}`);
  }
}
