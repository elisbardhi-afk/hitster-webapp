import { describe, it, expect } from "vitest";
import {
  createGame,
  drawSong,
  placeCard,
  skipSong,
  buyCard,
  awardArtistTitleBonus,
  endTurn,
  getWinner,
  isPlacementCorrect,
  challenge,
  resolveChallenge,
  loadScannedSong,
} from "@/lib/game-rules";
import type { Card } from "@/lib/game-rules-types";
import {
  STARTING_TOKENS,
  TOKEN_CAP,
  WIN_TIMELINE_LENGTH,
  SKIP_TOKEN_COST,
  BUY_TOKEN_COST,
} from "@/lib/game-rules-types";

const CARDS: Card[] = [
  { songId: "s1", title: "Yesterday", artist: "The Beatles", year: 1965 },
  { songId: "s2", title: "Imagine", artist: "John Lennon", year: 1971 },
  { songId: "s3", title: "Bohemian Rhapsody", artist: "Queen", year: 1975 },
  { songId: "s4", title: "Thriller", artist: "Michael Jackson", year: 1982 },
  { songId: "s5", title: "Wonderwall", artist: "Oasis", year: 1995 },
  { songId: "s6", title: "Hey Ya!", artist: "OutKast", year: 2003 },
  { songId: "s7", title: "Rolling in the Deep", artist: "Adele", year: 2010 },
  { songId: "s8", title: "Shape of You", artist: "Ed Sheeran", year: 2017 },
  { songId: "s9", title: "Bad Guy", artist: "Billie Eilish", year: 2019 },
  { songId: "s10", title: "Drivers License", artist: "Olivia Rodrigo", year: 2021 },
  { songId: "s11", title: "Levitating", artist: "Dua Lipa", year: 2020 },
  { songId: "s12", title: "Blinding Lights", artist: "The Weeknd", year: 2019 },
];

function cardsAsLookup(): Map<string, Card> {
  return new Map(CARDS.map((c) => [c.songId, c]));
}

function gameSetup(opts: { players?: string[]; variant?: "original" | "pro" | "expert" | "coop"; seed?: number } = {}) {
  const players = opts.players ?? ["Alice", "Bob"];
  const variant = opts.variant ?? "original";
  return createGame({
    players: players.map((n) => ({ id: n, nickname: n })),
    songs: CARDS,
    variant,
    seed: opts.seed ?? 42,
  });
}

describe("createGame", () => {
  it("creates a game with each player holding a single starter card on their timeline", () => {
    const state = gameSetup();
    expect(state.players).toHaveLength(2);
    for (const p of state.players) {
      expect(p.timeline).toHaveLength(1);
    }
  });

  it("gives each player the variant-specific number of starting tokens", () => {
    expect(gameSetup({ variant: "original" }).players[0].tokens).toBe(STARTING_TOKENS.original);
    expect(gameSetup({ variant: "pro" }).players[0].tokens).toBe(STARTING_TOKENS.pro);
    expect(gameSetup({ variant: "expert" }).players[0].tokens).toBe(STARTING_TOKENS.expert);
  });

  it("starts at currentPlayerIdx 0 with no currentSong and no winner", () => {
    const state = gameSetup();
    expect(state.currentPlayerIdx).toBe(0);
    expect(state.currentSong).toBeNull();
    expect(state.winner).toBeNull();
  });

  it("fills the drawPile with the remaining songs (one per player removed for starters)", () => {
    const state = gameSetup({ players: ["A", "B", "C"] });
    expect(state.drawPile.length).toBe(CARDS.length - 3);
  });

  it("co-op variant uses a single shared timeline on players[0]", () => {
    const state = gameSetup({ variant: "coop", players: ["A", "B", "C"] });
    expect(state.players).toHaveLength(3);
    expect(state.players[0].timeline.length).toBe(1);
    // Other players' personal timelines should be empty in co-op
    expect(state.players[1].timeline.length).toBe(0);
    expect(state.players[2].timeline.length).toBe(0);
  });

  it("deterministic with the same seed", () => {
    const a = gameSetup({ seed: 7 });
    const b = gameSetup({ seed: 7 });
    expect(a.drawPile).toEqual(b.drawPile);
  });

  it("throws when there are fewer than 2 players", () => {
    expect(() => createGame({
      players: [{ id: "only", nickname: "Only" }],
      songs: CARDS,
      variant: "original",
      seed: 1,
    })).toThrow();
  });

  it("throws when there are not enough songs", () => {
    expect(() => createGame({
      players: [{ id: "A", nickname: "A" }, { id: "B", nickname: "B" }],
      songs: CARDS.slice(0, 1),
      variant: "original",
      seed: 1,
    })).toThrow();
  });
});

describe("drawSong", () => {
  it("draws the top of the drawPile into currentSong (unrevealed)", () => {
    let s = gameSetup();
    const beforeLen = s.drawPile.length;
    s = drawSong(s, cardsAsLookup());
    expect(s.currentSong).not.toBeNull();
    expect(s.currentSong!.revealed).toBe(false);
    expect(s.drawPile.length).toBe(beforeLen - 1);
  });

  it("is a no-op when a song is already current", () => {
    let s = gameSetup();
    s = drawSong(s, cardsAsLookup());
    const drawn = s.currentSong;
    s = drawSong(s, cardsAsLookup());
    expect(s.currentSong).toEqual(drawn);
  });

  it("ends the game when drawPile is empty and no current song", () => {
    let s = gameSetup();
    s = { ...s, drawPile: [], currentSong: null };
    s = drawSong(s, cardsAsLookup());
    // longest timeline wins; tie => first by id
    expect(s.winner).not.toBeNull();
  });
});

describe("loadScannedSong (QR mode)", () => {
  it("loads a scanned card as the current song and removes it from drawPile", () => {
    let s = gameSetup();
    const target = CARDS.find((c) => s.drawPile.includes(c.songId))!;
    const before = s.drawPile.length;
    s = loadScannedSong(s, target);
    expect(s.currentSong?.card.songId).toBe(target.songId);
    expect(s.drawPile.length).toBe(before - 1);
    expect(s.drawPile).not.toContain(target.songId);
  });

  it("is a no-op when a song is already current", () => {
    let s = gameSetup();
    s = drawSong(s, cardsAsLookup());
    const current = s.currentSong;
    s = loadScannedSong(s, CARDS[0]);
    expect(s.currentSong).toEqual(current);
  });
});

describe("isPlacementCorrect", () => {
  it("returns true when slot is between cards earlier and later", () => {
    const timeline: Card[] = [
      { songId: "a", title: "", artist: "", year: 1960 },
      { songId: "b", title: "", artist: "", year: 1980 },
    ];
    const card: Card = { songId: "x", title: "", artist: "", year: 1970 };
    expect(isPlacementCorrect(timeline, 1, card)).toBe(true); // between
    expect(isPlacementCorrect(timeline, 0, card)).toBe(false); // before earliest
    expect(isPlacementCorrect(timeline, 2, card)).toBe(false); // after latest
  });

  it("returns true at the leftmost slot when card year is earlier than all", () => {
    const timeline: Card[] = [
      { songId: "a", title: "", artist: "", year: 1990 },
      { songId: "b", title: "", artist: "", year: 2000 },
    ];
    const card: Card = { songId: "x", title: "", artist: "", year: 1970 };
    expect(isPlacementCorrect(timeline, 0, card)).toBe(true);
    expect(isPlacementCorrect(timeline, 1, card)).toBe(false);
  });

  it("returns true at the rightmost slot when card year is later than all", () => {
    const timeline: Card[] = [
      { songId: "a", title: "", artist: "", year: 1990 },
      { songId: "b", title: "", artist: "", year: 2000 },
    ];
    const card: Card = { songId: "x", title: "", artist: "", year: 2010 };
    expect(isPlacementCorrect(timeline, 2, card)).toBe(true);
    expect(isPlacementCorrect(timeline, 1, card)).toBe(false);
  });

  it("accepts either side when adjacent card has the same year", () => {
    const timeline: Card[] = [
      { songId: "a", title: "", artist: "", year: 2000 },
      { songId: "b", title: "", artist: "", year: 2010 },
    ];
    const card: Card = { songId: "x", title: "", artist: "", year: 2000 };
    // Putting it either before or after the same-year card is OK.
    expect(isPlacementCorrect(timeline, 0, card)).toBe(true);
    expect(isPlacementCorrect(timeline, 1, card)).toBe(true);
    expect(isPlacementCorrect(timeline, 2, card)).toBe(false);
  });

  it("returns true for a single-element timeline same year", () => {
    const timeline: Card[] = [{ songId: "a", title: "", artist: "", year: 2000 }];
    const card: Card = { songId: "x", title: "", artist: "", year: 2000 };
    expect(isPlacementCorrect(timeline, 0, card)).toBe(true);
    expect(isPlacementCorrect(timeline, 1, card)).toBe(true);
  });
});

describe("placeCard", () => {
  function withCurrent(state = gameSetup(), card?: Card) {
    const s = drawSong(state, cardsAsLookup());
    if (card) {
      return { ...s, currentSong: { card, revealed: false } };
    }
    return s;
  }

  it("rejects placement when there's no current song", () => {
    const s = gameSetup();
    expect(() => placeCard(s, 0)).toThrow();
  });

  it("rejects placement at out-of-range position", () => {
    let s = withCurrent();
    expect(() => placeCard(s, 5)).toThrow();
  });

  it("inserts the card into the active player's timeline on correct placement", () => {
    const player1Start: Card = { songId: "p1", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "", artist: "", year: 2000 };
    let s = gameSetup();
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: [player1Start] },
        s.players[1],
      ],
    };
    s = { ...s, currentSong: { card: newCard, revealed: false } };
    s = placeCard(s, 1); // after the 1990 card
    expect(s.players[0].timeline).toHaveLength(2);
    expect(s.players[0].timeline[1].songId).toBe("x");
    expect(s.currentSong!.revealed).toBe(true);
  });

  it("does NOT add the card on incorrect placement", () => {
    const player1Start: Card = { songId: "p1", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "", artist: "", year: 2000 };
    let s = gameSetup();
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: [player1Start] },
        s.players[1],
      ],
      currentSong: { card: newCard, revealed: false },
    };
    s = placeCard(s, 0); // before 1990 — wrong
    expect(s.players[0].timeline).toHaveLength(1);
    expect(s.discardPile).toContain("x");
    expect(s.currentSong!.revealed).toBe(true);
  });

  it("declares winner when timeline reaches WIN_TIMELINE_LENGTH", () => {
    let s = gameSetup();
    const ascendingYears: Card[] = Array.from({ length: WIN_TIMELINE_LENGTH - 1 }).map((_, i) => ({
      songId: `seed-${i}`,
      title: "",
      artist: "",
      year: 1900 + i,
    }));
    const winningCard: Card = { songId: "win", title: "", artist: "", year: 1900 + WIN_TIMELINE_LENGTH };
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: ascendingYears },
        s.players[1],
      ],
      currentSong: { card: winningCard, revealed: false },
    };
    s = placeCard(s, ascendingYears.length);
    expect(s.winner).toBe(s.players[0].id);
  });
});

describe("tokens", () => {
  it("skipSong: spends SKIP_TOKEN_COST and clears the current song", () => {
    let s = gameSetup();
    s = drawSong(s, cardsAsLookup());
    const songId = s.currentSong!.card.songId;
    const startingTokens = s.players[0].tokens;
    s = skipSong(s);
    expect(s.currentSong).toBeNull();
    expect(s.players[0].tokens).toBe(startingTokens - SKIP_TOKEN_COST);
    expect(s.discardPile).toContain(songId);
  });

  it("skipSong: throws when player has 0 tokens", () => {
    let s = gameSetup();
    s = drawSong(s, cardsAsLookup());
    s = {
      ...s,
      players: [{ ...s.players[0], tokens: 0 }, s.players[1]],
    };
    expect(() => skipSong(s)).toThrow();
  });

  it("buyCard: spends BUY_TOKEN_COST and adds top of drawPile at correct year", () => {
    let s = gameSetup();
    s = {
      ...s,
      players: [{ ...s.players[0], tokens: BUY_TOKEN_COST }, s.players[1]],
    };
    const startingTimeline = s.players[0].timeline.length;
    s = buyCard(s, cardsAsLookup());
    expect(s.players[0].tokens).toBe(0);
    expect(s.players[0].timeline.length).toBe(startingTimeline + 1);
    // newly added card year fits its slot
    for (let i = 1; i < s.players[0].timeline.length; i++) {
      expect(s.players[0].timeline[i].year).toBeGreaterThanOrEqual(
        s.players[0].timeline[i - 1].year,
      );
    }
  });

  it("buyCard: throws when player can't afford it", () => {
    let s = gameSetup();
    s = {
      ...s,
      players: [{ ...s.players[0], tokens: BUY_TOKEN_COST - 1 }, s.players[1]],
    };
    expect(() => buyCard(s, cardsAsLookup())).toThrow();
  });

  it("awardArtistTitleBonus: +1 token for title, +1 for artist, capped at TOKEN_CAP", () => {
    let s = gameSetup();
    s = {
      ...s,
      players: [{ ...s.players[0], tokens: TOKEN_CAP - 1 }, s.players[1]],
    };
    s = awardArtistTitleBonus(s, { titleCorrect: true, artistCorrect: true });
    expect(s.players[0].tokens).toBe(TOKEN_CAP);
  });
});

describe("endTurn", () => {
  it("advances currentPlayerIdx and clears currentSong + pendingChallenge", () => {
    let s = gameSetup();
    s = drawSong(s, cardsAsLookup());
    s = placeCard(s, 0);
    s = endTurn(s);
    expect(s.currentPlayerIdx).toBe(1);
    expect(s.currentSong).toBeNull();
    expect(s.pendingChallenge).toBeNull();
  });

  it("wraps around to player 0 after the last player", () => {
    let s = gameSetup({ players: ["A", "B", "C"] });
    s = { ...s, currentPlayerIdx: 2 };
    s = endTurn(s);
    expect(s.currentPlayerIdx).toBe(0);
  });
});

describe("getWinner", () => {
  it("returns null when no one has won", () => {
    expect(getWinner(gameSetup())).toBeNull();
  });

  it("returns the player id whose timeline reaches WIN_TIMELINE_LENGTH", () => {
    const s = gameSetup();
    const longTimeline: Card[] = Array.from({ length: WIN_TIMELINE_LENGTH }).map((_, i) => ({
      songId: `c${i}`, title: "", artist: "", year: 1900 + i,
    }));
    const mutated = {
      ...s,
      players: [{ ...s.players[0], timeline: longTimeline }, s.players[1]],
    };
    expect(getWinner(mutated)).toBe(s.players[0].id);
  });
});

describe("challenge (online mode)", () => {
  it("records a pending challenge", () => {
    let s = gameSetup({ players: ["A", "B", "C"] });
    s = drawSong(s, cardsAsLookup());
    s = challenge(s, "B", 0); // B challenges, will place at slot 0 on their own timeline
    expect(s.pendingChallenge).toEqual({ challengerIdx: 1, position: 0 });
  });

  it("rejects challenge by the active player", () => {
    let s = gameSetup({ players: ["A", "B"] });
    s = drawSong(s, cardsAsLookup());
    expect(() => challenge(s, "A", 0)).toThrow();
  });

  it("resolveChallenge applies the challenger's placement and clears state", () => {
    let s = gameSetup({ players: ["A", "B"] });
    const earlyCard: Card = { songId: "p", title: "", artist: "", year: 1980 };
    const newCard: Card = { songId: "n", title: "", artist: "", year: 2000 };
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: [earlyCard] },
        { ...s.players[1], timeline: [earlyCard] },
      ],
      currentSong: { card: newCard, revealed: false },
      pendingChallenge: { challengerIdx: 1, position: 1 }, // B places after 1980
    };
    s = resolveChallenge(s);
    // Challenger gets the card if correct
    expect(s.players[1].timeline.map((c) => c.songId)).toContain("n");
    expect(s.pendingChallenge).toBeNull();
  });
});

describe("PRO variant", () => {
  it("placing correctly is NOT enough — must also be awarded title+artist", () => {
    let s = gameSetup({ variant: "pro" });
    const start: Card = { songId: "p", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "X", artist: "Y", year: 2000 };
    s = {
      ...s,
      players: [{ ...s.players[0], timeline: [start] }, s.players[1]],
      currentSong: { card: newCard, revealed: false },
    };
    s = placeCard(s, 1, { titleCorrect: false, artistCorrect: true });
    // In PRO, missing title means the card is NOT kept.
    expect(s.players[0].timeline).toHaveLength(1);
    expect(s.discardPile).toContain("x");
  });

  it("PRO keeps the card when placement + title + artist all correct", () => {
    let s = gameSetup({ variant: "pro" });
    const start: Card = { songId: "p", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "X", artist: "Y", year: 2000 };
    s = {
      ...s,
      players: [{ ...s.players[0], timeline: [start] }, s.players[1]],
      currentSong: { card: newCard, revealed: false },
    };
    s = placeCard(s, 1, { titleCorrect: true, artistCorrect: true });
    expect(s.players[0].timeline).toHaveLength(2);
  });
});

describe("co-op variant", () => {
  it("placing correctly grows the shared timeline (players[0]) and never deducts tokens", () => {
    let s = gameSetup({ variant: "coop", players: ["A", "B"] });
    const start: Card = { songId: "p", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "", artist: "", year: 2000 };
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: [start] },
        s.players[1],
      ],
      currentSong: { card: newCard, revealed: false },
    };
    const startingTokens = s.players[0].tokens;
    s = placeCard(s, 1);
    expect(s.players[0].timeline).toHaveLength(2);
    expect(s.players[0].tokens).toBe(startingTokens); // no token loss on correct
  });

  it("placing incorrectly in co-op deducts 1 shared token", () => {
    let s = gameSetup({ variant: "coop", players: ["A", "B"] });
    const start: Card = { songId: "p", title: "", artist: "", year: 1990 };
    const newCard: Card = { songId: "x", title: "", artist: "", year: 2000 };
    s = {
      ...s,
      players: [
        { ...s.players[0], timeline: [start] },
        s.players[1],
      ],
      currentSong: { card: newCard, revealed: false },
    };
    const startingTokens = s.players[0].tokens;
    s = placeCard(s, 0); // wrong
    expect(s.players[0].tokens).toBe(startingTokens - 1);
    expect(s.players[0].timeline).toHaveLength(1);
  });

  it("co-op loses when shared tokens hit 0 before 10 cards", () => {
    let s = gameSetup({ variant: "coop", players: ["A", "B"] });
    s = {
      ...s,
      players: [
        { ...s.players[0], tokens: 1, timeline: [{ songId: "p", title: "", artist: "", year: 1990 }] },
        s.players[1],
      ],
      currentSong: { card: { songId: "x", title: "", artist: "", year: 2000 }, revealed: false },
    };
    s = placeCard(s, 0); // wrong
    expect(s.winner).toBe("__defeat__");
  });
});
