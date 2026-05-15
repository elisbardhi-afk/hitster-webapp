"use server";

import { revalidatePath } from "next/cache";
import { deleteSong, updateSongYear } from "@/lib/songs";

export async function deleteSongAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteSong(id);
  revalidatePath("/admin");
  revalidatePath("/admin/qr-sheet");
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
