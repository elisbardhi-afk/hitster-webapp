"use client";

import { useState } from "react";

const OPTIONS = [
  {
    value: "",
    label: "No limit",
    description: "Players take as long as they need.",
  },
  {
    value: "30",
    label: "30 seconds",
    description: "Fast-paced. Timer starts when music plays.",
  },
  {
    value: "60",
    label: "60 seconds",
    description: "Standard timed. Timer starts when music plays.",
  },
];

export function TimerSelect() {
  const [selected, setSelected] = useState("");

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm text-neutral-300">Turn timer</legend>
      {OPTIONS.map((opt) => {
        const active = selected === opt.value;
        return (
          <label
            key={opt.value}
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
              name="turnTimer"
              value={opt.value}
              checked={active}
              onChange={() => setSelected(opt.value)}
              className="sr-only"
            />
            <span className="flex-1">
              <span
                className={`block font-semibold text-sm ${active ? "text-white" : "text-neutral-300"}`}
              >
                {opt.label}
              </span>
              <span className="block text-xs text-neutral-400 mt-0.5">
                {opt.description}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
