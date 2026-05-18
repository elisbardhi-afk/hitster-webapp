"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createRoom } from "@/lib/games";
import type { DeviceMode, Variant } from "@/lib/game-rules-types";

const PLAYER_COOKIE_PREFIX = "hitster_player_";

export async function createRoomAction(formData: FormData) {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const variant = String(formData.get("variant") ?? "original") as Variant;
  const deviceMode = String(formData.get("deviceMode") ?? "per-device") as DeviceMode;
  const tagFilter = formData
    .getAll("tags")
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0);
  const categoryFilter = formData
    .getAll("categoryFilter")
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0);
  if (!nickname) {
    redirect(`/online/new?error=${encodeURIComponent("Nickname required")}`);
  }
  if (!["original", "pro", "expert", "coop"].includes(variant)) {
    redirect(`/online/new?error=${encodeURIComponent("Invalid variant")}`);
  }
  if (!["shared", "per-device"].includes(deviceMode)) {
    redirect(`/online/new?error=${encodeURIComponent("Invalid device mode")}`);
  }

  try {
    const room = await createRoom({
      hostNickname: nickname,
      variant,
      deviceMode,
      tagFilter,
      categoryFilter,
    });
    // Host's player id is the first (and only) player at creation
    const hostId = room.state.players[0].id;
    cookies().set(`${PLAYER_COOKIE_PREFIX}${room.code}`, hostId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    redirect(`/online/${room.code}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create room";
    if (msg === "NEXT_REDIRECT") throw err;
    redirect(`/online/new?error=${encodeURIComponent(msg)}`);
  }
}
