"use client";

import clsx from "clsx";
import type { Player } from "@/lib/game-rules-types";

type Props = {
  players: Player[];
  currentIdx: number;
  variant: "original" | "pro" | "expert" | "coop";
};

export function PlayerBar({ players, currentIdx, variant }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p, i) => (
        <div
          key={p.id}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-sm flex items-center gap-2",
            i === currentIdx
              ? "border-fuchsia-400 bg-fuchsia-400/10"
              : "border-neutral-800 bg-neutral-900/40",
          )}
        >
          <span className={clsx("font-medium", i === currentIdx && "text-fuchsia-200")}>
            {p.nickname}
          </span>
          <span className="text-xs text-neutral-400">
            {variant === "coop" ? null : `${p.timeline.length}/10 cards`}
          </span>
          {variant !== "coop" && (
            <span className="text-xs text-amber-300">{"●".repeat(p.tokens)}</span>
          )}
        </div>
      ))}
      {variant === "coop" && (
        <div className="rounded-full border border-amber-400 bg-amber-400/10 px-3 py-1.5 text-sm">
          Team: {players[0].timeline.length}/10 cards •{" "}
          <span className="text-amber-200">{"●".repeat(players[0].tokens)}</span>
        </div>
      )}
    </div>
  );
}
