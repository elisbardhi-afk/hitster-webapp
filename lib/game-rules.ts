import type {
  Card,
  GameState,
  Player,
  Variant,
} from "./game-rules-types";
import {
  STARTING_TOKENS,
  TOKEN_CAP,
  WIN_TIMELINE_LENGTH,
  SKIP_TOKEN_COST,
  BUY_TOKEN_COST,
} from "./game-rules-types";

export type { Card, GameState, Player, Variant } from "./game-rules-types";

// ---- PRNG (deterministic for seeded games) ---------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- Setup -----------------------------------------------------------------

export type CreateGameInput = {
  players: { id: string; nickname: string }[];
  songs: Card[];
  variant: Variant;
  seed: number;
};

export function createGame(input: CreateGameInput): GameState {
  if (input.players.length < 2) {
    throw new Error("Need at least 2 players");
  }
  const startersNeeded = input.variant === "coop" ? 1 : input.players.length;
  if (input.songs.length < startersNeeded + 1) {
    throw new Error("Not enough songs to seed timelines and have a draw pile");
  }

  const rng = mulberry32(input.seed);
  const shuffled = shuffle(input.songs, rng);
  const starters = shuffled.slice(0, startersNeeded);
  const drawPile = shuffled.slice(startersNeeded).map((c) => c.songId);

  const startingTokens = STARTING_TOKENS[input.variant];
  const players: Player[] = input.players.map((p, i) => ({
    id: p.id,
    nickname: p.nickname,
    timeline:
      input.variant === "coop"
        ? i === 0
          ? [starters[0]]
          : []
        : [starters[i]],
    tokens:
      input.variant === "coop" ? (i === 0 ? startingTokens : 0) : startingTokens,
    score: 0,
  }));

  return {
    players,
    currentPlayerIdx: 0,
    currentSong: null,
    drawPile,
    discardPile: [],
    variant: input.variant,
    winner: null,
    pendingChallenge: null,
    turnStartedAt: new Date().toISOString(),
  };
}

// ---- Helpers ---------------------------------------------------------------

/** In co-op the shared timeline lives on players[0]; in other variants, on the active player. */
function timelineOwnerIdx(state: GameState, fallbackIdx: number): number {
  return state.variant === "coop" ? 0 : fallbackIdx;
}

function replacePlayer(
  players: Player[],
  idx: number,
  patch: Partial<Player>,
): Player[] {
  return players.map((p, i) => (i === idx ? { ...p, ...patch } : p));
}

function clampTokens(n: number): number {
  return Math.max(0, Math.min(TOKEN_CAP, n));
}

// ---- Placement checking ----------------------------------------------------

export function isPlacementCorrect(
  timeline: Card[],
  position: number,
  card: Card,
): boolean {
  if (position < 0 || position > timeline.length) return false;
  const left = timeline[position - 1];
  const right = timeline[position];
  if (left && card.year < left.year) return false;
  if (right && card.year > right.year) return false;
  return true;
}

function insertSorted(timeline: Card[], position: number, card: Card): Card[] {
  return [...timeline.slice(0, position), card, ...timeline.slice(position)];
}

/** Find the correct insertion index for `buyCard` (left-most slot the card fits in). */
function correctSlot(timeline: Card[], card: Card): number {
  for (let i = 0; i < timeline.length; i++) {
    if (card.year < timeline[i].year) return i;
  }
  return timeline.length;
}

// ---- Drawing songs ---------------------------------------------------------

export function drawSong(
  state: GameState,
  cards: Map<string, Card>,
): GameState {
  if (state.currentSong) return state;
  if (state.winner) return state;
  if (state.drawPile.length === 0) {
    // End the game: longest timeline wins; tie → first player by id.
    let bestIdx = 0;
    for (let i = 1; i < state.players.length; i++) {
      if (
        state.players[i].timeline.length > state.players[bestIdx].timeline.length
      ) {
        bestIdx = i;
      }
    }
    return { ...state, winner: state.players[bestIdx].id };
  }

  const [nextId, ...rest] = state.drawPile;
  const card = cards.get(nextId);
  if (!card) {
    throw new Error(`drawSong: card ${nextId} not in lookup`);
  }
  return {
    ...state,
    drawPile: rest,
    currentSong: { card, revealed: false },
    turnStartedAt: new Date().toISOString(),
  };
}

/** QR-mode helper: load a scanned card as the current song, removing it from drawPile if present. */
export function loadScannedSong(state: GameState, card: Card): GameState {
  if (state.winner) return state;
  if (state.currentSong) return state;
  return {
    ...state,
    drawPile: state.drawPile.filter((id) => id !== card.songId),
    currentSong: { card, revealed: false },
    turnStartedAt: new Date().toISOString(),
  };
}

// ---- Placement -------------------------------------------------------------

export type PlaceBonuses = {
  titleCorrect?: boolean;
  artistCorrect?: boolean;
  yearCorrect?: boolean;
};

export function placeCard(
  state: GameState,
  position: number,
  bonuses: PlaceBonuses = {},
): GameState {
  if (!state.currentSong) {
    throw new Error("placeCard: no current song");
  }
  const ownerIdx = timelineOwnerIdx(state, state.currentPlayerIdx);
  const owner = state.players[ownerIdx];
  if (position < 0 || position > owner.timeline.length) {
    throw new Error(`placeCard: position ${position} out of range`);
  }

  const card = state.currentSong.card;
  const placementOK = isPlacementCorrect(owner.timeline, position, card);

  // Variant-specific keep-the-card rule.
  const keep = (() => {
    if (!placementOK) return false;
    if (state.variant === "pro") {
      return Boolean(bonuses.titleCorrect && bonuses.artistCorrect);
    }
    if (state.variant === "expert") {
      return Boolean(
        bonuses.titleCorrect && bonuses.artistCorrect && bonuses.yearCorrect,
      );
    }
    return true;
  })();

  let players = state.players;
  let discardPile = state.discardPile;
  let winner = state.winner;

  if (keep) {
    const newTimeline = insertSorted(owner.timeline, position, card);
    players = replacePlayer(players, ownerIdx, { timeline: newTimeline });
    if (newTimeline.length >= WIN_TIMELINE_LENGTH) {
      // In co-op, "owner" is the shared timeline — the team wins.
      winner = state.variant === "coop" ? state.players[0].id : owner.id;
    }
  } else {
    discardPile = [...discardPile, card.songId];
    // Co-op: incorrect placement costs the team a token.
    if (state.variant === "coop") {
      const tokens = clampTokens(state.players[0].tokens - 1);
      players = replacePlayer(players, 0, { tokens });
      if (tokens === 0 && !winner) {
        winner = "__defeat__";
      }
    }
  }

  // Award PRO/Expert tokens for naming bonuses where applicable, even on miss (per official rules for "original" — for PRO/Expert, naming is required to keep the card, no separate bonus).
  if (state.variant === "original" && bonuses.artistCorrect) {
    const tokens = clampTokens(players[ownerIdx].tokens + 1);
    players = replacePlayer(players, ownerIdx, { tokens });
  }

  return {
    ...state,
    players,
    discardPile,
    winner,
    currentSong: { ...state.currentSong, revealed: true },
  };
}

// ---- Tokens ----------------------------------------------------------------

export function skipSong(state: GameState): GameState {
  if (!state.currentSong) throw new Error("skipSong: no current song");
  const ownerIdx = timelineOwnerIdx(state, state.currentPlayerIdx);
  const owner = state.players[ownerIdx];
  if (owner.tokens < SKIP_TOKEN_COST) {
    throw new Error("skipSong: not enough tokens");
  }
  const players = replacePlayer(state.players, ownerIdx, {
    tokens: owner.tokens - SKIP_TOKEN_COST,
  });
  return {
    ...state,
    players,
    discardPile: [...state.discardPile, state.currentSong.card.songId],
    currentSong: null,
  };
}

export function buyCard(
  state: GameState,
  cards: Map<string, Card>,
): GameState {
  const ownerIdx = timelineOwnerIdx(state, state.currentPlayerIdx);
  const owner = state.players[ownerIdx];
  if (owner.tokens < BUY_TOKEN_COST) {
    throw new Error("buyCard: not enough tokens");
  }
  if (state.drawPile.length === 0) {
    throw new Error("buyCard: drawPile empty");
  }

  const [nextId, ...rest] = state.drawPile;
  const card = cards.get(nextId);
  if (!card) throw new Error(`buyCard: card ${nextId} not in lookup`);

  const slot = correctSlot(owner.timeline, card);
  const newTimeline = insertSorted(owner.timeline, slot, card);

  const players = replacePlayer(state.players, ownerIdx, {
    timeline: newTimeline,
    tokens: owner.tokens - BUY_TOKEN_COST,
  });

  let winner = state.winner;
  if (newTimeline.length >= WIN_TIMELINE_LENGTH) {
    winner = state.variant === "coop" ? state.players[0].id : owner.id;
  }

  return {
    ...state,
    players,
    drawPile: rest,
    winner,
  };
}

export function awardArtistTitleBonus(
  state: GameState,
  { titleCorrect, artistCorrect }: { titleCorrect: boolean; artistCorrect: boolean },
): GameState {
  if (!titleCorrect || !artistCorrect) return state;
  const ownerIdx = timelineOwnerIdx(state, state.currentPlayerIdx);
  const owner = state.players[ownerIdx];
  const players = replacePlayer(state.players, ownerIdx, {
    tokens: clampTokens(owner.tokens + 1),
  });
  return { ...state, players };
}

// ---- Turn management -------------------------------------------------------

export function endTurn(state: GameState): GameState {
  if (state.winner) return state;
  const nextIdx = (state.currentPlayerIdx + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIdx: nextIdx,
    currentSong: null,
    pendingChallenge: null,
    turnStartedAt: new Date().toISOString(),
  };
}

export function getWinner(state: GameState): string | null {
  if (state.winner) return state.winner;
  for (const p of state.players) {
    if (p.timeline.length >= WIN_TIMELINE_LENGTH) return p.id;
  }
  return null;
}

// ---- Challenges (online mode) ----------------------------------------------

export function challenge(
  state: GameState,
  challengerId: string,
  position: number,
): GameState {
  if (!state.currentSong) throw new Error("challenge: no current song");
  const challengerIdx = state.players.findIndex((p) => p.id === challengerId);
  if (challengerIdx === -1) throw new Error("challenge: unknown challenger");
  if (challengerIdx === state.currentPlayerIdx) {
    throw new Error("challenge: active player cannot challenge");
  }
  if (state.pendingChallenge) {
    throw new Error("challenge: another challenge already pending");
  }
  return {
    ...state,
    pendingChallenge: { challengerIdx, position },
  };
}

export function resolveChallenge(state: GameState): GameState {
  if (!state.pendingChallenge) throw new Error("resolveChallenge: nothing pending");
  if (!state.currentSong) throw new Error("resolveChallenge: no current song");

  const { challengerIdx, position } = state.pendingChallenge;
  const challenger = state.players[challengerIdx];
  const card = state.currentSong.card;
  const placementOK = isPlacementCorrect(challenger.timeline, position, card);

  let players = state.players;
  let discardPile = state.discardPile;
  let winner = state.winner;

  if (placementOK) {
    const newTimeline = insertSorted(challenger.timeline, position, card);
    players = replacePlayer(players, challengerIdx, { timeline: newTimeline });
    if (newTimeline.length >= WIN_TIMELINE_LENGTH) {
      winner = challenger.id;
    }
  } else {
    discardPile = [...discardPile, card.songId];
  }

  return {
    ...state,
    players,
    discardPile,
    winner,
    currentSong: { ...state.currentSong, revealed: true },
    pendingChallenge: null,
  };
}
