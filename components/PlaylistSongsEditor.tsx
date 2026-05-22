"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { updatePlaylistSongsAction } from "@/app/admin/(protected)/playlists/actions";
import type { Song } from "@/lib/songs";

export function PlaylistSongsEditor({
  playlistId,
  songs,
  initialSongIds,
}: {
  playlistId: string;
  songs: Song[];
  initialSongIds: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(initialSongIds)
  );
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const initialSet = useMemo(() => new Set(initialSongIds), [initialSongIds]);

  const filtered = songs
    .filter(
      (s) =>
        query === "" ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const ai = initialSet.has(a.id) ? 0 : 1;
      const bi = initialSet.has(b.id) ? 0 : 1;
      return ai - bi;
    });

  const allFilteredChecked =
    filtered.length > 0 && filtered.every((s) => checked.has(s.id));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setChecked((prev) => {
      const next = new Set(prev);
      if (allFilteredChecked) {
        filtered.forEach((s) => next.delete(s.id));
      } else {
        filtered.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }

  function handleSave() {
    const formData = new FormData();
    formData.append("playlistId", playlistId);
    for (const id of Array.from(checked)) formData.append("songIds", id);
    startTransition(() => updatePlaylistSongsAction(formData));
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Songs — {checked.size} selected
        </span>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline underline-offset-2"
            >
              {allFilteredChecked ? "Deselect all" : "Select all"}
            </button>
          )}
          <input
            type="text"
            placeholder="Search title or artist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-neutral-400 w-52"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
        {filtered.map((s) => (
          <div
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-neutral-800 select-none ${
              checked.has(s.id) ? "bg-neutral-800/60" : ""
            }`}
          >
            <div
              className={`w-4 h-4 rounded flex-shrink-0 border-2 ${
                checked.has(s.id)
                  ? "bg-fuchsia-500 border-fuchsia-500"
                  : "border-neutral-600"
              }`}
            />
            {s.album_art_url ? (
              <Image
                src={s.album_art_url}
                alt=""
                width={36}
                height={36}
                className="rounded flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-9 h-9 rounded bg-neutral-800 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.title}</p>
              <p className="text-xs text-neutral-500 truncate">
                {s.artist} · {s.release_year}
              </p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && query && (
          <p className="text-xs text-neutral-500 py-4 text-center">
            No songs match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-semibold hover:bg-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save song list"}
        </button>
      </div>
    </div>
  );
}
