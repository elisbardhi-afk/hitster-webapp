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

export async function bulkImportAction(formData: FormData) {
  const raw = String(formData.get("inputs") ?? "");
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let added = 0;
  const failures: string[] = [];

  for (const line of lines) {
    const trackId = extractTrackId(line);
    if (!trackId) {
      failures.push(`${line}: could not parse track ID`);
      continue;
    }
    try {
      await importTrackById(trackId, tags);
      added++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      failures.push(`${line}: ${msg}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/qr-sheet");

  const params = new URLSearchParams();
  params.set("added", String(added));
  if (failures.length > 0) {
    params.set("failed", failures.join("\n"));
  }
  redirect(`/admin/songs/bulk?${params.toString()}`);
}
