"use client";

import type { GameState } from "@/lib/game-rules-types";
import { BUY_TOKEN_COST, SKIP_TOKEN_COST } from "@/lib/game-rules-types";

type Props = {
  state: GameState;
  onSkip: () => void;
  onBuy: () => void;
};

export function TokenBar({ state, onSkip, onBuy }: Props) {
  const idx = state.variant === "coop" ? 0 : state.currentPlayerIdx;
  const tokens = state.players[idx]?.tokens ?? 0;
  const canSkip = tokens >= SKIP_TOKEN_COST && state.currentSong !== null && !state.currentSong.revealed;
  const canBuy = tokens >= BUY_TOKEN_COST && state.drawPile.length > 0 && !state.currentSong?.revealed;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-neutral-400">
        Tokens: <span className="text-amber-300">{tokens}</span>
      </span>
      <button
        type="button"
        onClick={onSkip}
        disabled={!canSkip}
        className="rounded-lg border border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-800"
      >
        Skip (−{SKIP_TOKEN_COST})
      </button>
      <button
        type="button"
        onClick={onBuy}
        disabled={!canBuy}
        className="rounded-lg border border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-800"
      >
        Buy a card (−{BUY_TOKEN_COST})
      </button>
    </div>
  );
}
