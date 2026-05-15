"use client";

import { useState } from "react";

const MODES = [
  {
    value: "shared",
    label: "One shared device",
    description: "You play all turns from your device, passing it around. Songs draw from the catalog (no QR scanning).",
  },
  {
    value: "per-device",
    label: "One device per player",
    description: "Each player on their own phone. Only the current player can act on their turn.",
  },
];

export function DeviceModeSelect() {
  const [selected, setSelected] = useState("shared");

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-neutral-300">Device mode</legend>
      {MODES.map((mode) => {
        const active = selected === mode.value;
        return (
          <label
            key={mode.value}
            className={[
              "flex items-start gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all duration-200",
              "backdrop-blur-md border",
              active
                ? "bg-white/10 border-white/30 shadow-[0_0_16px_rgba(255,255,255,0.08)]"
                : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07] hover:border-white/20",
            ].join(" ")}
          >
            <input
              type="radio"
              name="deviceMode"
              value={mode.value}
              checked={active}
              onChange={() => setSelected(mode.value)}
              className="sr-only"
            />
            <span className="flex-1">
              <span className={`block font-semibold text-sm ${active ? "text-white" : "text-neutral-300"}`}>
                {mode.label}
              </span>
              <span className="block text-xs text-neutral-400 mt-0.5">{mode.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
