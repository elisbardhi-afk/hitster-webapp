# Songs Catalog Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side search field to the admin songs catalog that filters by title, artist, year, and tag.

**Architecture:** The server component `app/admin/(protected)/page.tsx` continues to fetch all songs; the song list rendering is extracted into a new `"use client"` component `SongCatalogList` that owns the search input and filtered display. No server round-trips for search.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Vitest + jsdom + @testing-library/react.

---

## File Map

| File | Change |
|---|---|
| `components/SongCatalogList.tsx` | New: client component with search + filtered list |
| `tests/song-catalog-list.test.tsx` | New: tests for filter logic and UI |
| `app/admin/(protected)/page.tsx` | Modify: replace inline list with `<SongCatalogList>` |

---

## Task 1: Create SongCatalogList Component

**Files:**
- Create: `components/SongCatalogList.tsx`
- Create: `tests/song-catalog-list.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/song-catalog-list.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { SongCatalogList } from "@/components/SongCatalogList";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("@/app/admin/(protected)/actions", () => ({
  deleteSongAction: vi.fn(),
  updateYearAction: vi.fn(),
}));

const SONGS = [
  {
    id: "s1",
    spotify_id: "sp1",
    title: "Yesterday",
    artist: "The Beatles",
    release_year: 1965,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["classic", "pop"],
  },
  {
    id: "s2",
    spotify_id: "sp2",
    title: "Imagine",
    artist: "John Lennon",
    release_year: 1971,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["classic"],
  },
  {
    id: "s3",
    spotify_id: "sp3",
    title: "Thriller",
    artist: "Michael Jackson",
    release_year: 1982,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["pop", "albanian"],
  },
];

describe("SongCatalogList – search", () => {
  it("shows all songs when query is empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Imagine")).toBeInTheDocument();
    expect(screen.getByText("Thriller")).toBeInTheDocument();
  });

  it("filters by title (case-insensitive)", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "yester" },
    });
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.queryByText("Imagine")).not.toBeInTheDocument();
    expect(screen.queryByText("Thriller")).not.toBeInTheDocument();
  });

  it("filters by artist", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "lennon" },
    });
    expect(screen.getByText("Imagine")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("filters by year", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "1982" },
    });
    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("filters by tag", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "albanian" },
    });
    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("shows filtered count when query is non-empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "classic" },
    });
    expect(screen.getByText(/2 of 3 songs/)).toBeInTheDocument();
  });

  it("shows empty state when nothing matches", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/no songs match/i)).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("does not show count line when query is empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    expect(screen.queryByText(/of 3 songs/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/song-catalog-list.test.tsx
```

Expected: FAIL — `SongCatalogList` not found.

- [ ] **Step 3: Create the component**

Create `components/SongCatalogList.tsx`:

```tsx
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/song-catalog-list.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SongCatalogList.tsx tests/song-catalog-list.test.tsx
git commit -m "feat: add SongCatalogList client component with search"
```

---

## Task 2: Wire SongCatalogList into the Catalog Page

**Files:**
- Modify: `app/admin/(protected)/page.tsx`

- [ ] **Step 1: Update the page**

Replace the full contents of `app/admin/(protected)/page.tsx` with:

```tsx
import Link from "next/link";
import { listSongs } from "@/lib/songs";
import { SongCatalogList } from "@/components/SongCatalogList";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const songs = await listSongs();

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Song catalog</h1>
        <p className="text-sm text-neutral-400">
          {songs.length} song{songs.length === 1 ? "" : "s"}
        </p>
      </div>

      {songs.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          No songs yet.{" "}
          <Link href="/admin/songs/new" className="underline">
            Add one
          </Link>{" "}
          or{" "}
          <Link href="/admin/songs/bulk" className="underline">
            bulk import
          </Link>{" "}
          a list.
        </p>
      ) : (
        <SongCatalogList songs={songs} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (including the 8 new ones).

- [ ] **Step 4: Commit**

```bash
git add app/admin/\(protected\)/page.tsx
git commit -m "feat: wire SongCatalogList into admin catalog page"
```
