"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { joinRoom } from "@/lib/games";

const PLAYER_COOKIE_PREFIX = "hitster_player_";

export async function joinRoomAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!code || !nickname) {
    redirect(`/online/join?error=${encodeURIComponent("Code and nickname required")}`);
  }

  try {
    const { room, playerId } = await joinRoom({ code, nickname });
    cookies().set(`${PLAYER_COOKIE_PREFIX}${room.code}`, playerId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    redirect(`/online/${room.code}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not join";
    if (msg === "NEXT_REDIRECT") throw err;
    redirect(`/online/join?error=${encodeURIComponent(msg)}&code=${encodeURIComponent(code)}`);
  }
}
