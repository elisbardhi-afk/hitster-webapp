"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase";
import { PlayerBar } from "@/components/PlayerBar";
import { TimelineRow } from "@/components/TimelineRow";
import { TokenBar } from "@/components/TokenBar";
import { CardFlip } from "@/components/CardFlip";
import type { GameState, Card } from "@/lib/game-rules-types";
import type { GameRow } from "@/lib/games";

type CardWithPreview = Card & { previewUrl: string };
import {
  addPlayerAction,
  buyCardAction,
  closeRoomAction,
  endTurnAction,
  placeCardAction,
  skipSongAction,
  startGameAction,
} from "./actions";

type Props = {
  initialRoom: GameRow;
  playerId: string;
  cards: CardWithPreview[];
};

export function OnlineGame({ initialRoom, playerId, cards }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRow>(initialRoom);

  // Keep a stable cards lookup so audio effect doesn't re-trigger on prop reshuffles.
  const cardsByIdRef = useRef<Map<string, CardWithPreview>>(new Map());
  useEffect(() => {
    cardsByIdRef.current = new Map(cards.map((c) => [c.songId, c]));
  }, [cards]);

  // Server may push a newer initialRoom (after revalidatePath / router.refresh).
  // Only adopt it when its updated_at is newer than the local copy — avoids
  // overwriting a more recent realtime push.
  useEffect(() => {
    if (
      new Date(initialRoom.updated_at).getTime() >
      new Date(room.updated_at).getTime()
    ) {
      setRoom(initialRoom);
    }
  }, [initialRoom, room.updated_at]);

  // Subscribe to realtime changes on this room (if enabled in Supabase).
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`room:${initialRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${initialRoom.id}`,
        },
        (payload) => {
          setRoom(payload.new as GameRow);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRoom.id]);

  const state: GameState = room.state;
  const myIdx = state.players.findIndex((p) => p.id === playerId);
  const isMyTurn = myIdx === state.currentPlayerIdx;
  const isHost = state.players[0]?.id === playerId;

  // Audio: play the preview for the current song on every device.
  // Only depend on currentSongId — using a ref for the lookup so prop changes
  // don't re-trigger playback.
  const [artistGuess, setArtistGuess] = useState("");
  const [titleGuess, setTitleGuess] = useState("");
  const [yearGuess, setYearGuess] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentSongId = state.currentSong?.card.songId ?? null;

  // Reset guesses whenever a new song is drawn.
  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setYearGuess("");
  }, [currentSongId]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSongId) return;
    const card = cardsByIdRef.current.get(currentSongId);
    if (card?.previewUrl) {
      audio.src = card.previewUrl;
    }
  }, [currentSongId]);

  const code = room.code;

  // ---- LOBBY ----
  if (room.status === "lobby") {
    return <Lobby
      code={code}
      state={state}
      playerId={playerId}
      isHost={isHost}
    />;
  }

  // ---- GAME ----
  const isShared = state.deviceMode === "shared";

  // In shared mode the host's device drives every player's turn.
  // In per-device mode you must be in the room as a player.
  if (!isShared && myIdx === -1) {
    return (
      <div className="max-w-md mx-auto text-center mt-8">
        <p className="text-neutral-400">You&apos;re not in this game.</p>
      </div>
    );
  }
  if (isShared && !isHost && myIdx === -1) {
    return (
      <div className="max-w-md mx-auto text-center mt-8">
        <p className="text-neutral-400">
          Watching room <strong>{code}</strong> — only the host&apos;s device can act.
        </p>
      </div>
    );
  }

  const canAct = isShared ? isHost : isMyTurn;
  const currentPlayer = state.players[state.currentPlayerIdx];
  // Active timeline = current player's in both shared and per-device mode.
  // Co-op overrides to players[0].
  const ownerIdx =
    state.variant === "coop"
      ? 0
      : state.currentPlayerIdx;
  const ownerTimeline = state.players[ownerIdx].timeline;
  const ownerName = state.players[ownerIdx]?.nickname ?? "Player";

  const handlePlace = async (position: number) => {
    try {
      await placeCardAction({
        code,
        playerId,
        position,
        artistGuess: artistGuess || undefined,
        titleGuess: titleGuess || undefined,
        yearGuess:
          state.variant === "expert" && yearGuess
            ? Number(yearGuess)
            : undefined,
      });
      setArtistGuess("");
      setTitleGuess("");
      setYearGuess("");
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "Could not place card");
    }
    router.refresh();
  };
  const handleSkip = async () => {
    try {
      await skipSongAction({ code, playerId });
    } catch (err) {
      console.error(err);
    }
    router.refresh();
  };
  const handleBuy = async () => {
    try {
      await buyCardAction({ code, playerId });
    } catch (err) {
      console.error(err);
    }
    router.refresh();
  };
  const handleEndTurn = async () => {
    try {
      await endTurnAction({ code, playerId });
    } catch (err) {
      console.error(err);
    }
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← exit
        </Link>
        <span className="text-xs uppercase tracking-widest text-neutral-500">
          room {code}
        </span>
        {isHost ? (
          <CloseRoomButton code={code} playerId={playerId} variant="game" />
        ) : (
          <span className="text-xs text-neutral-700">·</span>
        )}
      </header>

      <PlayerBar
        players={state.players}
        currentIdx={state.currentPlayerIdx}
        variant={state.variant}
      />

      {state.winner ? (
        <WinScreen state={state} />
      ) : (
        <>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-neutral-400">
              {isShared
                ? `${currentPlayer.nickname}'s turn — pass the device`
                : canAct
                  ? "Your turn"
                  : `Waiting for ${currentPlayer.nickname}…`}
            </h2>

            {state.currentSong && (
              <div className="flex flex-col items-center gap-3">
                <CardFlip card={state.currentSong.card} revealed={state.currentSong.revealed} />
                <audio ref={audioRef} controls className="w-full max-w-sm" />
                {!state.currentSong.revealed && canAct && (
                  <div className="w-full max-w-sm space-y-2">
                    {state.variant === "original" && (
                      <p className="text-xs text-neutral-500 text-center">
                        Name artist + title for a bonus token (optional)
                      </p>
                    )}
                    {(state.variant === "pro" || state.variant === "expert") && (
                      <p className="text-xs text-amber-400 text-center">
                        {state.variant === "pro"
                          ? "PRO: you must name the artist and title to keep the card"
                          : "Expert: name artist, title and exact year to keep the card"}
                      </p>
                    )}
                    {state.variant !== "coop" && (
                      <>
                        <input
                          value={artistGuess}
                          onChange={(e) => setArtistGuess(e.target.value)}
                          placeholder="Artist name"
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        />
                        <input
                          value={titleGuess}
                          onChange={(e) => setTitleGuess(e.target.value)}
                          placeholder="Song title"
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        />
                        {state.variant === "expert" && (
                          <input
                            type="number"
                            value={yearGuess}
                            onChange={(e) => setYearGuess(e.target.value)}
                            placeholder="Exact year (e.g. 1995)"
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                          />
                        )}
                      </>
                    )}
                    <p className="text-sm text-neutral-400 text-center">
                      Then tap a slot on{" "}
                      {isShared ? `${ownerName}'s` : "your"} timeline to place this card.
                    </p>
                  </div>
                )}
                {state.currentSong.revealed && canAct && (
                  <button
                    onClick={handleEndTurn}
                    className="rounded-2xl bg-neutral-100 text-neutral-900 px-6 py-2 font-semibold hover:bg-white"
                  >
                    Next turn
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
            <h2 className="text-sm uppercase tracking-widest text-neutral-400">
              {state.variant === "coop"
                ? "Team timeline"
                : `${ownerName}'s timeline`}
            </h2>
            <TimelineRow
              timeline={ownerTimeline}
              onPlaceAt={
                canAct && state.currentSong && !state.currentSong.revealed
                  ? handlePlace
                  : undefined
              }
            />
          </section>

          {canAct && (
            <TokenBar state={state} onSkip={handleSkip} onBuy={handleBuy} />
          )}
        </>
      )}
    </div>
  );
}

function Lobby({
  code,
  state,
  playerId,
  isHost,
}: {
  code: string;
  state: GameState;
  playerId: string;
  isHost: boolean;
}) {
  const [addedNickname, setAddedNickname] = useState("");
  const [adding, setAdding] = useState(false);
  const [lastAdded, setLastAdded] = useState<{
    nickname: string;
    playerId: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/online/join?code=${code}`
      : "";

  const playAsUrl = (pid: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/online/${code}/as/${pid}`
      : "";

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = addedNickname.trim();
    if (!name) return;
    setAdding(true);
    try {
      const { playerId: pid } = await addPlayerAction({ code, nickname: name });
      setLastAdded({ nickname: name, playerId: pid });
      setAddedNickname("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="text-center space-y-1">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← home
        </Link>
        <h1 className="text-3xl font-bold tracking-widest">{code}</h1>
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          {state.deviceMode === "shared"
            ? "One shared device"
            : "One device per player"}
        </p>
        {state.tagFilter && state.tagFilter.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {state.tagFilter.map((t) => (
              <span
                key={t}
                className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200 px-2 py-0.5 text-[10px] uppercase tracking-widest"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-neutral-400">
          {state.deviceMode === "shared"
            ? "Add players by nickname below. You'll play every turn on this device, passing it around."
            : "Share this code or the link below. Players join from /online/join."}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => copy("invite", inviteUrl)}
          className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          {copied === "invite" ? "✓ Copied" : "Copy invite link"}
        </button>
        <button
          onClick={() => copy("code", code)}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          {copied === "code" ? "✓ Copied" : "Copy code"}
        </button>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-3">
          Players in this room
        </h2>
        <ul className="space-y-2">
          {state.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 px-3 py-2"
            >
              <span className="truncate">
                {p.nickname}{" "}
                {p.id === playerId && (
                  <span className="text-xs text-fuchsia-300">(you)</span>
                )}
                {p.id === state.players[0].id && (
                  <span className="ml-1 text-[10px] uppercase text-amber-300">
                    host
                  </span>
                )}
              </span>
              {isHost && p.id !== playerId && (
                <button
                  onClick={() => copy(`p-${p.id}`, playAsUrl(p.id))}
                  className="shrink-0 text-xs text-neutral-400 hover:text-neutral-100 underline"
                  title="Copy a link that signs in as this player"
                >
                  {copied === `p-${p.id}` ? "✓ link copied" : "play-as link"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost && (
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Add a player by nickname
          </h2>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              value={addedNickname}
              onChange={(e) => setAddedNickname(e.target.value)}
              placeholder="Nickname"
              maxLength={20}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              disabled={adding || !addedNickname.trim() || state.players.length >= 10}
              className="rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-semibold hover:bg-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {lastAdded && (
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3 text-sm space-y-2">
              <p>
                Added <strong>{lastAdded.nickname}</strong>. Send them this link:
              </p>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded bg-neutral-950 border border-neutral-800 px-2 py-1 text-xs">
                  {playAsUrl(lastAdded.playerId)}
                </code>
                <button
                  onClick={() => copy("last", playAsUrl(lastAdded.playerId))}
                  className="rounded border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                >
                  {copied === "last" ? "✓" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-neutral-400">
                Opening that link sets the device as this player. You can also
                open it in a new tab to test on this device.
              </p>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            {state.players.length}/10 players
          </p>
        </section>
      )}

      {isHost ? (
        <div className="space-y-2">
          <StartButton code={code} disabled={state.players.length < 2} />
          <CloseRoomButton code={code} playerId={playerId} variant="lobby" />
        </div>
      ) : (
        <p className="text-sm text-neutral-400 text-center">
          Waiting for the host to start…
        </p>
      )}
    </div>
  );
}

function StartButton({ code, disabled }: { code: string; disabled: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || submitting}
      onClick={async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
          await startGameAction(code);
        } finally {
          // Realtime will switch the screen to the game view; leave button disabled.
        }
      }}
      className="w-full rounded-2xl bg-neutral-100 text-neutral-900 px-4 py-3 font-semibold hover:bg-white disabled:opacity-50"
    >
      {submitting ? "Starting…" : "Start game"}
    </button>
  );
}

function CloseRoomButton({
  code,
  playerId,
  variant,
}: {
  code: string;
  playerId: string;
  variant: "lobby" | "game";
}) {
  const [working, setWorking] = useState(false);
  return (
    <button
      type="button"
      disabled={working}
      onClick={async () => {
        const ok = window.confirm(
          variant === "lobby"
            ? `Close room ${code}? All players in the lobby will lose it.`
            : `End this game and close room ${code}? Progress will be lost.`,
        );
        if (!ok) return;
        setWorking(true);
        try {
          await closeRoomAction({ code, playerId });
        } catch (err) {
          window.alert(
            err instanceof Error ? err.message : "Could not close room",
          );
          setWorking(false);
        }
      }}
      className={
        variant === "lobby"
          ? "w-full rounded-2xl border border-red-700/50 text-red-300 px-4 py-2 text-sm hover:bg-red-900/20 disabled:opacity-50"
          : "text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
      }
    >
      {working ? "Closing…" : variant === "lobby" ? "Close room" : "Close room"}
    </button>
  );
}

function WinScreen({ state }: { state: GameState }) {
  const winnerName = (() => {
    if (state.winner === "__defeat__") return "Defeat — the team ran out of tokens";
    const w = state.players.find((p) => p.id === state.winner);
    return w?.nickname ?? "";
  })();
  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-8 text-center space-y-4">
      <h2 className="text-3xl font-bold text-amber-200">🏆 {winnerName}</h2>
      <Link
        href="/"
        className="inline-block rounded-2xl bg-neutral-100 text-neutral-900 px-6 py-2 font-semibold hover:bg-white"
      >
        Back home
      </Link>
    </div>
  );
}
