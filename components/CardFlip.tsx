"use client";

import clsx from "clsx";
import type { Card } from "@/lib/game-rules-types";
import { useEffect, useRef, useState } from "react";

type Props = {
  card: Card;
  revealed: boolean;
};

export function CardFlip({ card, revealed }: Props) {
  const [hideContent, setHideContent] = useState(false);
  const prevRevealed = useRef(revealed);

  useEffect(() => {
    const wasRevealed = prevRevealed.current;
    prevRevealed.current = revealed;
    if (wasRevealed && !revealed) {
      setHideContent(true);
      const timer = setTimeout(() => setHideContent(false), 700);
      return () => clearTimeout(timer);
    }
  }, [revealed]);

  return (
    <div className="relative w-44 h-60 [perspective:1000px]">
      <div
        className={clsx(
          "absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d]",
          revealed && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Front: hidden info */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-700 to-amber-500 flex items-center justify-center text-4xl font-bold [backface-visibility:hidden]">
          Hitster
        </div>
        {/* Back: title / artist / year */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 p-4 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {!hideContent && (
            <>
              <div className="text-xs uppercase tracking-widest text-neutral-500">
                now playing
              </div>
              <div>
                <div className="text-base font-semibold leading-tight">{card.title}</div>
                <div className="text-sm text-neutral-400">{card.artist}</div>
              </div>
              <div className="text-3xl font-bold text-amber-300">{card.year}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
