"use server";

import { revalidatePath } from "next/cache";
import { deleteSong, updateSongYear, updateSongTags, getSong } from "@/lib/songs";

export async function deleteSongAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteSong(id);
  revalidatePath("/admin");
  revalidatePath("/admin/qr-sheet");
}

export async function toggleTagAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tag = String(formData.get("tag") ?? "").trim().toLowerCase();
  if (!id || !tag) return;
  const song = await getSong(id);
  if (!song) return;
  const current = song.tags ?? [];
  const next = current.includes(tag)
    ? current.filter((t) => t !== tag)
    : [...current, tag];
  await updateSongTags(id, next);
  revalidatePath("/admin");
}

export async function updateYearAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const yearRaw = String(formData.get("year") ?? "");
  const year = parseInt(yearRaw, 10);
  if (!id) return;
  if (Number.isNaN(year) || year < 1900 || year > 2100) {
    throw new Error("Year must be a number between 1900 and 2100");
  }
  await updateSongYear(id, year);
  revalidatePath("/admin");
  revalidatePath("/admin/qr-sheet");
}
