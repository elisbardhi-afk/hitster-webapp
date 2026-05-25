"use server";

import { revalidatePath } from "next/cache";
import {
  buyCard,
  drawSong,
  endTurn,
  placeCard,
  skipSong,
  type PlaceBonuses,
} from "@/lib/game-rules";
import { redirect } from "next/navigation";
import {
  addPlayerToRoom,
  deleteRoom,
  getCardsMap,
  getRoomByCode,
  startRoom,
  updateRoomState,
} from "@/lib/games";

export async function closeRoomAction(opts: {
  code: string;
  playerId: string;
}): Promise<void> {
  const room = await getRoomByCode(opts.code);
  if (!room) return; // already gone
  const hostId = room.state.players[0]?.id;
  if (hostId !== opts.playerId) {
    throw new Error("Only the host can close this room");
  }
  await deleteRoom(room.id);
  revalidatePath(`/online/${opts.code}`);
  revalidatePath("/admin/rooms");
  redirect("/");
}

export async function addPlayerAction(opts: {
  code: string;
  nickname: string;
}): Promise<{ playerId: string }> {
  const name = opts.nickname.trim();
  if (!name) throw new Error("Nickname required");
  const { playerId } = await addPlayerToRoom({ code: opts.code, nickname: name });
  revalidatePath(`/online/${opts.code}`);
  return { playerId };
}

async function withState(code: string) {
  const room = await getRoomByCode(code);
  if (!room) throw new Error("Room not found");
  return room;
}

/**
 * Authorization for game actions:
 * - per-device mode: actor must be the current player.
 * - shared mode: actor must be the host (state.players[0]).
 * Throws if not allowed.
 */
function assertCanAct(room: Awaited<ReturnType<typeof withState>>, playerId: string) {
  const isShared = room.state.deviceMode === "shared";
  if (isShared) {
    const hostId = room.state.players[0]?.id;
    if (hostId !== playerId) throw new Error("Only the host controls this room");
    return;
  }
  const idx = room.state.players.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error("Not in this room");
  if (idx !== room.state.currentPlayerIdx) throw new Error("Not your turn");
}

export async function startGameAction(code: string) {
  await startRoom({ code });
  revalidatePath(`/online/${code}`);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export async function placeCardAction(opts: {
  code: string;
  playerId: string;
  position: number;
  artistGuess?: string;
  titleGuess?: string;
  yearGuess?: number;
}) {
  const room = await withState(opts.code);
  assertCanAct(room, opts.playerId);

  const card = room.state.currentSong?.card;
  const bonuses: PlaceBonuses = {};
  if (card) {
    const norm = (s: string) => s.trim().toLowerCase();
    if (opts.artistGuess !== undefined)
      bonuses.artistCorrect = stringSimilarity(norm(opts.artistGuess), norm(card.artist)) >= 0.5;
    if (opts.titleGuess !== undefined)
      bonuses.titleCorrect = stringSimilarity(norm(opts.titleGuess), norm(card.title)) >= 0.5;
    if (opts.yearGuess !== undefined)
      bonuses.yearCorrect = opts.yearGuess === card.year;
  }

  const next = placeCard(room.state, opts.position, bonuses);
  await updateRoomState({
    code: opts.code,
    state: next,
    status: next.winner ? "finished" : "playing",
  });
  revalidatePath(`/online/${opts.code}`);
}

export async function endTurnAction(opts: { code: string; playerId: string }) {
  const room = await withState(opts.code);
  assertCanAct(room, opts.playerId);
  const after = endTurn(room.state);
  // Auto-draw next song so the next player sees their card immediately
  const cards = await getCardsMap();
  const drawn = drawSong(after, cards);
  await updateRoomState({
    code: opts.code,
    state: drawn,
    status: drawn.winner ? "finished" : "playing",
  });
  revalidatePath(`/online/${opts.code}`);
}

export async function skipSongAction(opts: { code: string; playerId: string }) {
  const room = await withState(opts.code);
  assertCanAct(room, opts.playerId);
  const afterSkip = skipSong(room.state);
  // Immediately draw the next song
  const cards = await getCardsMap();
  const afterDraw = drawSong(afterSkip, cards);
  await updateRoomState({
    code: opts.code,
    state: afterDraw,
    status: afterDraw.winner ? "finished" : "playing",
  });
  revalidatePath(`/online/${opts.code}`);
}

export async function buyCardAction(opts: { code: string; playerId: string }) {
  const room = await withState(opts.code);
  assertCanAct(room, opts.playerId);
  const cards = await getCardsMap();
  const next = buyCard(room.state, cards);
  await updateRoomState({
    code: opts.code,
    state: next,
    status: next.winner ? "finished" : "playing",
  });
  revalidatePath(`/online/${opts.code}`);
}
