"use client";

import clsx from "clsx";
import type { Card } from "@/lib/game-rules-types";

type Props = {
  timeline: Card[];
  /** Slot click handler (null = read-only). */
  onPlaceAt?: (position: number) => void;
  /** Highlight the slot the active card was just placed at (after reveal). */
  highlightSlot?: number | null;
  /** Show full card faces (year revealed) or hide year (during placement). */
  reveal?: boolean;
};

export function TimelineRow({ timeline, onPlaceAt, highlightSlot, reveal = true }: Props) {
  const placeable = !!onPlaceAt;
  const slotCount = timeline.length + 1;

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto px-1 py-2 snap-x">
      {Array.from({ length: slotCount }).map((_, slotIdx) => {
        const card = timeline[slotIdx];
        return (
          <div key={slotIdx} className="flex items-stretch gap-1 shrink-0">
            <button
              type="button"
              disabled={!placeable}
              onClick={() => onPlaceAt?.(slotIdx)}
              className={clsx(
                "h-24 w-3 rounded transition snap-start",
                placeable
                  ? "bg-fuchsia-700/30 hover:bg-fuchsia-500 cursor-pointer"
                  : "bg-transparent",
                highlightSlot === slotIdx && "ring-2 ring-amber-300",
              )}
              aria-label={`Place card at position ${slotIdx}`}
            />
            {card && (
              <div
                className={clsx(
                  "h-24 w-32 sm:w-36 rounded-xl px-3 py-2 flex flex-col justify-between bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 snap-start",
                )}
              >
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {reveal ? card.year : "?"}
                </div>
                <div className="text-xs font-semibold leading-tight line-clamp-2">
                  {card.title}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">{card.artist}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
