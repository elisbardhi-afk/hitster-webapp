export type Variant = "original" | "pro" | "expert" | "coop";

export type DeviceMode = "shared" | "per-device";

export type Card = {
  songId: string;
  title: string;
  artist: string;
  year: number;
};

export type Player = {
  id: string;
  nickname: string;
  timeline: Card[];   // sorted ascending by year (with same-year ties in placement order)
  tokens: number;
  score: number;      // PRO/Expert bonus track
};

export type GameState = {
  players: Player[];
  currentPlayerIdx: number;
  currentSong: { card: Card; revealed: boolean } | null;
  drawPile: string[];                     // upcoming song IDs (shuffled)
  discardPile: string[];                  // discarded song IDs
  variant: Variant;
  winner: string | null;                  // player id, or "team" for co-op
  pendingChallenge: {
    challengerIdx: number;
    position: number;
  } | null;
  turnStartedAt: string;                  // ISO timestamp (online-mode timeout)
  /** Online-only: who drives the game. "shared" = host's device only; "per-device" = each player's own. Optional for back-compat. */
  deviceMode?: DeviceMode;
  /** Online-only: tags chosen at room creation. Empty array = no filter (use full catalog). */
  tagFilter?: string[];
  /**
   * Co-op variant only: shared timeline and shared tokens.
   * In co-op, players[0].timeline and players[0].tokens are authoritative.
   */
};

export type PlacementResult = {
  correct: boolean;
  insertedAt: number;   // index in the player's timeline
};

export type TokenAction = "skip" | "buy" | "challenge";

export const STARTING_TOKENS: Record<Variant, number> = {
  original: 2,
  pro: 5,
  expert: 5,
  coop: 5,
};

export const TOKEN_CAP = 5;
export const WIN_TIMELINE_LENGTH = 10;
export const SKIP_TOKEN_COST = 1;
export const BUY_TOKEN_COST = 3;
