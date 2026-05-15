"use server";

import { revalidatePath } from "next/cache";
import { deleteRoom } from "@/lib/games";

export async function deleteRoomAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteRoom(id);
  revalidatePath("/admin/rooms");
}
