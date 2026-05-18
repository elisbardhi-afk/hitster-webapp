import { getServerClient } from "./supabase";
import { createGame, drawSong } from "./game-rules";
import type { DeviceMode, GameState, Variant } from "./game-rules-types";
import { listSongs } from "./songs";
import { filterSongs } from "./song-filter";
import type { Card } from "./game-rules-types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous

function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export type GameRow = {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  variant: Variant;
  state: GameState;
  created_at: string;
  updated_at: string;
};

export async function createRoom(opts: {
  hostNickname: string;
  variant: Variant;
  deviceMode: DeviceMode;
  tagFilter: string[];
  categoryFilter: string[];
}): Promise<GameRow> {
  const supabase = getServerClient();

  // Generate a unique code (retry a few times if conflict).
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    code = randomCode(4);
    const { data } = await supabase.from("games").select("id").eq("code", code).maybeSingle();
    if (!data) break;
  }

  const initialState: GameState = {
    players: [
      {
        id: crypto.randomUUID(),
        nickname: opts.hostNickname,
        timeline: [],
        tokens: 0,
        score: 0,
      },
    ],
    currentPlayerIdx: 0,
    currentSong: null,
    drawPile: [],
    discardPile: [],
    variant: opts.variant,
    winner: null,
    pendingChallenge: null,
    turnStartedAt: new Date().toISOString(),
    deviceMode: opts.deviceMode,
    tagFilter: opts.tagFilter,
    categoryFilter: opts.categoryFilter,
  };

  const { data, error } = await supabase
    .from("games")
    .insert({
      code,
      status: "lobby",
      variant: opts.variant,
      state: initialState,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GameRow;
}

export async function getRoomByCode(code: string): Promise<GameRow | null> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GameRow | null) ?? null;
}

export async function joinRoom(opts: {
  code: string;
  nickname: string;
}): Promise<{ room: GameRow; playerId: string }> {
  return addPlayerToRoom({ code: opts.code, nickname: opts.nickname });
}

/** Add a player to a room (used by both the join flow and host-side add). */
export async function addPlayerToRoom(opts: {
  code: string;
  nickname: string;
}): Promise<{ room: GameRow; playerId: string }> {
  const room = await getRoomByCode(opts.code);
  if (!room) throw new Error("Room not found");
  if (room.status !== "lobby") throw new Error("Game already started");
  if (room.state.players.length >= 10) throw new Error("Room is full (10 max)");

  const playerId = crypto.randomUUID();
  const newState: GameState = {
    ...room.state,
    players: [
      ...room.state.players,
      { id: playerId, nickname: opts.nickname, timeline: [], tokens: 0, score: 0 },
    ],
  };

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("games")
    .update({ state: newState })
    .eq("id", room.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { room: data as GameRow, playerId };
}

export async function startRoom(opts: { code: string }): Promise<GameRow> {
  const room = await getRoomByCode(opts.code);
  if (!room) throw new Error("Room not found");
  // Idempotent: a double-click or refresh after the game already started just
  // returns the current state instead of erroring.
  if (room.status !== "lobby") return room;
  if (room.state.players.length < 2) throw new Error("Need at least 2 players");

  const allSongs = await listSongs();
  const wantedDecades = room.state.tagFilter ?? [];
  const wantedCategories = room.state.categoryFilter ?? [];
  const songs = filterSongs(allSongs, wantedDecades, wantedCategories);

  if (songs.length < room.state.players.length + 1) {
    const filters: string[] = [];
    if (wantedDecades.length > 0) filters.push(`decades: ${wantedDecades.join(", ")}`);
    if (wantedCategories.length > 0) filters.push(`categories: ${wantedCategories.join(", ")}`);
    throw new Error(
      filters.length === 0
        ? "Not enough songs in catalog"
        : `Not enough songs for the selected filters (${filters.join("; ")}). Need at least ${room.state.players.length + 1}, found ${songs.length}.`,
    );
  }

  const cards: Card[] = songs.map((s) => ({
    songId: s.id,
    title: s.title,
    artist: s.artist,
    year: s.release_year,
  }));

  const baseState = createGame({
    players: room.state.players.map((p) => ({ id: p.id, nickname: p.nickname })),
    songs: cards,
    variant: room.variant,
    seed: Math.floor(Math.random() * 1_000_000),
  });

  // Preserve deviceMode from the lobby state.
  const baseStateWithMode: GameState = {
    ...baseState,
    deviceMode: room.state.deviceMode ?? "per-device",
  };

  // Immediately draw the first song so player 1 can start.
  const cardsMap = new Map(cards.map((c) => [c.songId, c]));
  const state = drawSong(baseStateWithMode, cardsMap);

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("games")
    .update({ state, status: "playing" })
    .eq("id", room.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GameRow;
}

export async function updateRoomState(opts: {
  code: string;
  state: GameState;
  status?: "lobby" | "playing" | "finished";
}): Promise<GameRow> {
  const supabase = getServerClient();
  const update: Record<string, unknown> = { state: opts.state };
  if (opts.status) update.status = opts.status;
  const { data, error } = await supabase
    .from("games")
    .update(update)
    .eq("code", opts.code.toUpperCase())
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GameRow;
}

export async function listActiveRooms(): Promise<GameRow[]> {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("status", ["lobby", "playing"])
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GameRow[];
}

export async function getRoomsByCodes(codes: string[]): Promise<GameRow[]> {
  if (codes.length === 0) return [];
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("code", codes.map((c) => c.toUpperCase()))
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GameRow[];
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = getServerClient();
  const { error } = await supabase.from("games").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCardsMap(): Promise<Map<string, Card>> {
  const songs = await listSongs();
  return new Map(
    songs.map((s) => [
      s.id,
      {
        songId: s.id,
        title: s.title,
        artist: s.artist,
        year: s.release_year,
      },
    ]),
  );
}
