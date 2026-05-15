"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QrScanner } from "@/components/QrScanner";
import { TimelineRow } from "@/components/TimelineRow";
import { PlayerBar } from "@/components/PlayerBar";
import { TokenBar } from "@/components/TokenBar";
import { CardFlip } from "@/components/CardFlip";
import {
  createGame,
  placeCard,
  skipSong,
  buyCard,
  endTurn,
  loadScannedSong,
} from "@/lib/game-rules";
import type { Card, GameState, Variant } from "@/lib/game-rules-types";

type CardWithPreview = Card & { previewUrl: string };

const STORAGE_KEY = "hitster_qr_game_v1";

type Phase = "lobby" | "playing";

type SavedGame = {
  state: GameState;
  scanned: string[];                 // for cleanup tracking
};

type Props = {
  cards: CardWithPreview[];
};

export function QrGame({ cards }: Props) {
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.songId, c])), [cards]);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [variant, setVariant] = useState<Variant>("original");
  const [nicknames, setNicknames] = useState<string[]>(["", ""]);
  const [state, setState] = useState<GameState | null>(null);
  const [scanning, setScanning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resumeOffered, setResumeOffered] = useState(false);

  // Try to load saved game on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SavedGame;
        if (parsed.state && !parsed.state.winner) {
          setState(parsed.state);
          setResumeOffered(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist state
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, scanned: [] }));
    }
  }, [state]);

  // Play preview audio when a new song loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state?.currentSong) return;
    const card = state.currentSong.card as CardWithPreview;
    const fullCard = cardsById.get(card.songId);
    if (fullCard?.previewUrl) {
      audio.src = fullCard.previewUrl;
      audio.play().catch(() => {});
    }
  }, [state?.currentSong, cardsById]);

  const handleStart = useCallback(() => {
    const cleaned = nicknames.map((n) => n.trim()).filter((n) => n.length > 0);
    if (cleaned.length < 2) return;
    const game = createGame({
      players: cleaned.map((n, i) => ({ id: `p${i}`, nickname: n })),
      songs: cards,
      variant,
      seed: Math.floor(Math.random() * 1_000_000),
    });
    setState(game);
    setPhase("playing");
    setResumeOffered(false);
  }, [nicknames, cards, variant]);

  const handleResume = useCallback(() => {
    setPhase("playing");
    setResumeOffered(false);
  }, []);

  const handleAbandon = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(null);
    setResumeOffered(false);
  }, []);

  const handleScan = useCallback(
    (songId: string) => {
      setScanning(false);
      const card = cardsById.get(songId);
      if (!card) {
        setScanError(`That QR points to a song we don't have in the catalog (id: ${songId}).`);
        return;
      }
      setScanError(null);
      setState((prev) => (prev ? loadScannedSong(prev, card) : prev));
    },
    [cardsById],
  );

  const handlePlace = useCallback((position: number) => {
    setState((prev) => (prev ? placeCard(prev, position) : prev));
  }, []);

  const handleSkip = useCallback(() => {
    setState((prev) => (prev ? skipSong(prev) : prev));
  }, []);

  const handleBuy = useCallback(() => {
    setState((prev) => (prev ? buyCard(prev, cardsById) : prev));
  }, [cardsById]);

  const handleNextTurn = useCallback(() => {
    setState((prev) => (prev ? endTurn(prev) : prev));
  }, []);

  // ---- LOBBY ----
  if (phase === "lobby" || !state) {
    return (
      <div className="max-w-md mx-auto mt-8 space-y-6">
        <header>
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
            ← back
          </Link>
          <h1 className="text-2xl font-semibold mt-1">QR-scan mode</h1>
          <p className="text-sm text-neutral-400">
            One shared device. Pass it around. Scan a QR card on each turn.
          </p>
        </header>

        {resumeOffered && state && (
          <div className="rounded-2xl border border-fuchsia-700/40 bg-fuchsia-900/20 p-4 space-y-2">
            <p className="text-sm">Saved game in progress with {state.players.length} players.</p>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="rounded-lg bg-fuchsia-500 text-white px-3 py-1.5 text-sm hover:bg-fuchsia-400"
              >
                Resume
              </button>
              <button
                onClick={handleAbandon}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Start new
              </button>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Players (2 minimum)
          </h2>
          {nicknames.map((n, i) => (
            <input
              key={i}
              value={n}
              placeholder={`Player ${i + 1} nickname`}
              onChange={(e) =>
                setNicknames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
            />
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNicknames((prev) => [...prev, ""])}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
              disabled={nicknames.length >= 10}
            >
              + Add player
            </button>
            {nicknames.length > 2 && (
              <button
                type="button"
                onClick={() => setNicknames((prev) => prev.slice(0, -1))}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                − Remove last
              </button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Rules variant
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(["original", "pro", "expert", "coop"] as Variant[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`rounded-lg border px-3 py-2 text-sm capitalize ${
                  variant === v
                    ? "border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-100"
                    : "border-neutral-700 hover:bg-neutral-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleStart}
          disabled={nicknames.filter((n) => n.trim()).length < 2}
          className="w-full rounded-2xl bg-neutral-100 text-neutral-900 px-4 py-3 font-semibold hover:bg-white disabled:opacity-50"
        >
          Start game
        </button>
      </div>
    );
  }

  // ---- GAME ----
  const winner = state.winner;
  const current = state.currentSong;
  const ownerIdx = state.variant === "coop" ? 0 : state.currentPlayerIdx;
  const ownerTimeline = state.players[ownerIdx].timeline;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← exit
        </Link>
        <button
          onClick={handleAbandon}
          className="text-xs text-red-400 hover:text-red-300"
        >
          End game
        </button>
      </header>

      <PlayerBar players={state.players} currentIdx={state.currentPlayerIdx} variant={state.variant} />

      {winner ? (
        <WinScreen state={state} onPlayAgain={handleAbandon} />
      ) : (
        <>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-neutral-400">
              {state.players[state.currentPlayerIdx].nickname}&apos;s turn
            </h2>

            {!current && !scanning && (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-neutral-300 text-sm">Scan the next song card.</p>
                <button
                  onClick={() => setScanning(true)}
                  className="rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 px-6 py-3 font-semibold"
                >
                  Open camera
                </button>
                {scanError && <p className="text-sm text-red-400">{scanError}</p>}
              </div>
            )}

            {scanning && (
              <QrScanner onScan={handleScan} onCancel={() => setScanning(false)} />
            )}

            {current && (
              <div className="flex flex-col items-center gap-4">
                <CardFlip card={current.card} revealed={current.revealed} />
                <audio ref={audioRef} controls className="w-full max-w-sm" />
                {!current.revealed ? (
                  <p className="text-sm text-neutral-400 text-center">
                    Listen, then tap a slot on the timeline to place the card.
                  </p>
                ) : (
                  <PlacementResult state={state} onNext={handleNextTurn} />
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
            <h2 className="text-sm uppercase tracking-widest text-neutral-400">
              {state.variant === "coop"
                ? "Team timeline"
                : `${state.players[ownerIdx].nickname}'s timeline`}
            </h2>
            <TimelineRow
              timeline={ownerTimeline}
              onPlaceAt={
                current && !current.revealed ? handlePlace : undefined
              }
              reveal={true}
            />
          </section>

          <TokenBar state={state} onSkip={handleSkip} onBuy={handleBuy} />
        </>
      )}
    </div>
  );
}

function PlacementResult({
  state,
  onNext,
}: {
  state: GameState;
  onNext: () => void;
}) {
  const card = state.currentSong!.card;
  const ownerIdx = state.variant === "coop" ? 0 : state.currentPlayerIdx;
  const kept = state.players[ownerIdx].timeline.some((c) => c.songId === card.songId);

  return (
    <div className="flex flex-col items-center gap-3">
      <p
        className={`text-lg font-semibold ${
          kept ? "text-emerald-300" : "text-red-300"
        }`}
      >
        {kept ? "Correct! Card kept." : "Wrong — card discarded."}
      </p>
      <button
        onClick={onNext}
        className="rounded-2xl bg-neutral-100 text-neutral-900 px-6 py-2 font-semibold hover:bg-white"
      >
        Next turn
      </button>
    </div>
  );
}

function WinScreen({
  state,
  onPlayAgain,
}: {
  state: GameState;
  onPlayAgain: () => void;
}) {
  const winnerName = (() => {
    if (state.winner === "__defeat__") return "the song deck — you lost!";
    const winner = state.players.find((p) => p.id === state.winner);
    return winner?.nickname ?? state.winner ?? "";
  })();
  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-8 text-center space-y-4">
      <h2 className="text-3xl font-bold text-amber-200">🏆 {winnerName}</h2>
      <p className="text-sm text-neutral-300">
        {state.winner === "__defeat__"
          ? "The team ran out of tokens before collecting 10 cards."
          : "First to 10 — HITSTER!"}
      </p>
      <button
        onClick={onPlayAgain}
        className="rounded-2xl bg-neutral-100 text-neutral-900 px-6 py-2 font-semibold hover:bg-white"
      >
        Play again
      </button>
    </div>
  );
}
