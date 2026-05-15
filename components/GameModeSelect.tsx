"use client";

import { useState } from "react";

const MODES: Record<string, string> = {
  original: "Place cards on your timeline by guessing the release year. First to 10 wins.",
  pro: "Same as Original but you must also name the artist to keep the card.",
  expert: "Same as PRO but you must also name the exact year, not just the correct slot.",
  coop: "All players work together to build one shared timeline without making 3 collective mistakes.",
};

export function GameModeSelect() {
  const [mode, setMode] = useState("original");

  return (
    <div className="block space-y-1">
      <span className="text-sm text-neutral-300">Game Mode</span>
      <select
        name="variant"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
      >
        <option value="original">Original</option>
        <option value="pro">PRO</option>
        <option value="expert">Expert</option>
        <option value="coop">Co-op</option>
      </select>
      <p className="mt-1 text-xs text-neutral-400">
        <span className="font-bold text-neutral-200">Game Rules:</span> {MODES[mode]}
      </p>
    </div>
  );
}
