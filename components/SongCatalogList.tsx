"use client";

import { useState } from "react";
import Image from "next/image";
import { deleteSongAction, updateYearAction } from "@/app/admin/(protected)/actions";
import type { Song } from "@/lib/songs";

export function SongCatalogList({ songs }: { songs: Song[] }) {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();
  const filtered =
    q === ""
      ? songs
      : songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            String(s.release_year).includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q))
        );

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, artist, year or tag…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      {q !== "" && (
        <p className="text-xs text-neutral-500">
          {filtered.length} of {songs.length} songs
        </p>
      )}

      {filtered.length === 0 && q !== "" ? (
        <p className="text-sm text-neutral-400 py-4 text-center">
          No songs match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3"
            >
              {s.album_art_url ? (
                <Image
                  src={s.album_art_url}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded bg-neutral-800" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.title}</p>
                <p className="text-sm text-neutral-400 truncate">{s.artist}</p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-widest text-neutral-500 border border-neutral-800 rounded px-1.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <form action={updateYearAction} className="flex items-center gap-1">
                <input type="hidden" name="id" value={s.id} />
                <input
                  type="number"
                  name="year"
                  defaultValue={s.release_year}
                  min={1900}
                  max={2100}
                  className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-center"
                  aria-label={`Year for ${s.title}`}
                />
                <button
                  type="submit"
                  className="text-xs text-neutral-300 hover:text-white px-2 py-1 border border-neutral-700 rounded"
                  title="Save year"
                >
                  Save
                </button>
              </form>
              <form action={deleteSongAction}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="text-xs text-red-300 hover:text-red-200 px-2 py-1"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
