import { NextResponse } from "next/server";
import { getRoomByCode } from "@/lib/games";

const PLAYER_COOKIE_PREFIX = "hitster_player_";

export async function GET(
  request: Request,
  { params }: { params: { code: string; playerId: string } },
) {
  const code = params.code.toUpperCase();

  const room = await getRoomByCode(code);
  if (!room) {
    return new NextResponse("Room not found", { status: 404 });
  }
  const exists = room.state.players.some((p) => p.id === params.playerId);
  if (!exists) {
    return new NextResponse(
      `That player isn't in room ${code} anymore`,
      { status: 404 },
    );
  }

  const redirectUrl = new URL(`/online/${code}`, request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(`${PLAYER_COOKIE_PREFIX}${code}`, params.playerId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
