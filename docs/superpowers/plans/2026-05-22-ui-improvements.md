# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the admin homepage button, add a Select All toggle to the playlist song editor, and add a configurable per-turn countdown timer to online games.

**Architecture:** Three independent changes. The timer touches the most files — it threads a new `turnTimer` field from the room creation form through `GameState` down to the in-game UI, where a client-side countdown auto-ends the active player's turn when it reaches zero. No server-side enforcement; client-only.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Vitest + jsdom + @testing-library/react, Supabase realtime.

---

## File Map

| File | Change |
|---|---|
| `app/page.tsx` | Remove admin footer block |
| `components/PlaylistSongsEditor.tsx` | Add Select All / Deselect All button |
| `tests/playlist-songs-editor.test.tsx` | New: tests for select-all logic |
| `lib/game-rules-types.ts` | Add `turnTimer?: 30 \| 60 \| null` to `GameState` |
| `components/TimerSelect.tsx` | New: radio-card timer picker |
| `app/online/new/page.tsx` | Add `<TimerSelect />` to form |
| `app/online/new/actions.ts` | Read + validate `turnTimer` from form |
| `lib/games.ts` | Accept + store `turnTimer` in `createRoom` |
| `app/online/[code]/OnlineGame.tsx` | Countdown timer wired to audio play event |

---

## Task 1: Remove Admin Button

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Delete the admin footer**

In `app/page.tsx`, remove the entire footer element (lines 47–51):

```tsx
      <footer className="text-xs text-neutral-500">
        <Link href="/admin" className="hover:text-neutral-300">
          admin
        </Link>
      </footer>
```

The file should end with `</main>` followed by the closing brace. No other changes.

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: remove admin button from homepage"
```

---

## Task 2: Select All / Deselect All in PlaylistSongsEditor

**Files:**
- Modify: `components/PlaylistSongsEditor.tsx`
- Create: `tests/playlist-songs-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/playlist-songs-editor.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistSongsEditor } from "@/components/PlaylistSongsEditor";
import { vi } from "vitest";

// Stub the server action — it will never be called in these tests
vi.mock("@/app/admin/(protected)/playlists/actions", () => ({
  updatePlaylistSongsAction: vi.fn(),
}));

// Stub next/image to avoid complex rendering
vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const SONGS = [
  { id: "s1", title: "Yesterday", artist: "Beatles", release_year: 1965, album_art_url: null },
  { id: "s2", title: "Imagine", artist: "Lennon", release_year: 1971, album_art_url: null },
  { id: "s3", title: "Bohemian Rhapsody", artist: "Queen", release_year: 1975, album_art_url: null },
];

describe("PlaylistSongsEditor – select all", () => {
  it("button reads 'Select all' when no songs are checked", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={[]} />
    );
    expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument();
  });

  it("clicking 'Select all' checks all visible songs", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={[]} />
    );
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    // Counter should now show 3 selected
    expect(screen.getByText(/3 selected/)).toBeInTheDocument();
  });

  it("button reads 'Deselect all' when all songs are checked", () => {
    render(
      <PlaylistSongsEditor
        playlistId="p1"
        songs={SONGS}
        initialSongIds={["s1", "s2", "s3"]}
      />
    );
    expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
  });

  it("clicking 'Deselect all' unchecks all visible songs", () => {
    render(
      <PlaylistSongsEditor
        playlistId="p1"
        songs={SONGS}
        initialSongIds={["s1", "s2", "s3"]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /deselect all/i }));
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
  });

  it("Select all only affects filtered songs, not hidden ones", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={["s1"]} />
    );
    // Filter to show only "Yesterday"
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Yesterday" },
    });
    // "Select all" should add only s1 (already checked) — but since it's already
    // checked and it's the only filtered song, button becomes "Deselect all"
    expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/playlist-songs-editor.test.tsx
```

Expected: FAIL — "Unable to find role=button with name /select all/i"

- [ ] **Step 3: Add the Select All button to the component**

In `components/PlaylistSongsEditor.tsx`, add the following computed value and button.

After the existing `const filtered = …` block, add:

```ts
const allFilteredChecked =
  filtered.length > 0 && filtered.every((s) => checked.has(s.id));
```

Then add a `toggleSelectAll` function after the `toggle` function:

```ts
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
```

In the JSX, update the top flex row to include the button between the label and search input. The current row is:

```tsx
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Songs — {checked.size} selected
        </span>
        <input
          type="text"
          placeholder="Search title or artist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-neutral-400 w-52"
        />
      </div>
```

Replace it with:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/playlist-songs-editor.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/PlaylistSongsEditor.tsx tests/playlist-songs-editor.test.tsx
git commit -m "feat: add select all / deselect all toggle to playlist song editor"
```

---

## Task 3: Add turnTimer to GameState Type

**Files:**
- Modify: `lib/game-rules-types.ts`

- [ ] **Step 1: Add the field to GameState**

In `lib/game-rules-types.ts`, add the following line after the `playlistId` field inside `GameState`:

```ts
  /** Online-only: per-turn countdown in seconds. null = no limit. Absent = no limit (back-compat). */
  turnTimer?: 30 | 60 | null;
```

The updated block will look like:

```ts
  /** Online-only: playlist selected at room creation. Absent = full catalog. */
  playlistId?: string;
  /** Online-only: per-turn countdown in seconds. null = no limit. Absent = no limit (back-compat). */
  turnTimer?: 30 | 60 | null;
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/game-rules-types.ts
git commit -m "feat: add turnTimer field to GameState type"
```

---

## Task 4: Create TimerSelect Component

**Files:**
- Create: `components/TimerSelect.tsx`

- [ ] **Step 1: Create the component**

Create `components/TimerSelect.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/TimerSelect.tsx
git commit -m "feat: add TimerSelect component for room creation"
```

---

## Task 5: Wire Timer Through Room Creation

**Files:**
- Modify: `app/online/new/page.tsx`
- Modify: `app/online/new/actions.ts`
- Modify: `lib/games.ts`

- [ ] **Step 1: Add TimerSelect to the room creation form**

In `app/online/new/page.tsx`, import `TimerSelect`:

```tsx
import { TimerSelect } from "@/components/TimerSelect";
```

Then add `<TimerSelect />` between `<GameModeSelect />` and the playlist `<fieldset>`. The relevant section currently reads:

```tsx
        <GameModeSelect />

        <fieldset className="space-y-2">
          <legend className="text-sm text-neutral-300">Playlist</legend>
```

Replace with:

```tsx
        <GameModeSelect />
        <TimerSelect />

        <fieldset className="space-y-2">
          <legend className="text-sm text-neutral-300">Playlist</legend>
```

- [ ] **Step 2: Read and validate turnTimer in the server action**

In `app/online/new/actions.ts`, add timer parsing after the `playlistId` extraction. Current code ends the parsing block with:

```ts
  const playlistId = playlistIdRaw.length > 0 ? playlistIdRaw : undefined;
```

Add immediately after:

```ts
  const rawTimer = String(formData.get("turnTimer") ?? "").trim();
  const turnTimer: 30 | 60 | null =
    rawTimer === "30" ? 30 : rawTimer === "60" ? 60 : null;
```

Then update the `createRoom` call to pass `turnTimer`:

```ts
    const room = await createRoom({
      hostNickname: nickname,
      variant,
      deviceMode,
      playlistId,
      turnTimer,
    });
```

- [ ] **Step 3: Accept turnTimer in createRoom**

In `lib/games.ts`, update the `createRoom` function signature to accept `turnTimer`:

```ts
export async function createRoom(opts: {
  hostNickname: string;
  variant: Variant;
  deviceMode: DeviceMode;
  playlistId?: string;
  turnTimer?: 30 | 60 | null;
}): Promise<GameRow> {
```

Then in `initialState`, add `turnTimer` after `playlistId`:

```ts
    playlistId: opts.playlistId,
    turnTimer: opts.turnTimer ?? null,
```

- [ ] **Step 4: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/online/new/page.tsx app/online/new/actions.ts lib/games.ts
git commit -m "feat: wire turnTimer through room creation form and createRoom"
```

---

## Task 6: In-Game Countdown Timer

**Files:**
- Modify: `app/online/[code]/OnlineGame.tsx`

- [ ] **Step 1: Add timer state and refs**

In `app/online/[code]/OnlineGame.tsx`, add new state and ref declarations alongside the existing `artistGuess`/`audioRef` declarations. After the line:

```ts
  const audioRef = useRef<HTMLAudioElement>(null);
```

Add:

```ts
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerStartedRef = useRef(false);
```

- [ ] **Step 2: Reset timer on new turn**

The existing effect that resets guesses on `currentSongId` change currently reads:

```ts
  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setYearGuess("");
  }, [currentSongId]);
```

Update it to also reset the timer:

```ts
  useEffect(() => {
    setArtistGuess("");
    setTitleGuess("");
    setYearGuess("");
    setTimeLeft(null);
    timerStartedRef.current = false;
  }, [currentSongId]);
```

- [ ] **Step 3: Start timer on audio play**

The existing effect that sets `audio.src` reads:

```ts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSongId) return;
    const card = cardsByIdRef.current.get(currentSongId);
    if (card?.previewUrl) {
      audio.src = card.previewUrl;
    }
  }, [currentSongId]);
```

Replace it with:

```ts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSongId) return;
    const card = cardsByIdRef.current.get(currentSongId);
    if (card?.previewUrl) {
      audio.src = card.previewUrl;
    }

    function handlePlay() {
      if (timerStartedRef.current) return;
      const limit = state.turnTimer;
      if (!limit) return;
      timerStartedRef.current = true;
      setTimeLeft(limit);
    }

    audio.addEventListener("play", handlePlay);
    return () => audio.removeEventListener("play", handlePlay);
  }, [currentSongId, state.turnTimer]);
```

- [ ] **Step 4: Add the countdown effect**

Add a new `useEffect` after the audio effect above:

```ts
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => (t ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft !== 0 || !canAct) return;
    endTurnAction({ code, playerId }).catch(() => {}).then(() => router.refresh());
  }, [timeLeft, canAct, code, playerId]);
```

Note: the `canAct`, `code`, `playerId`, and `router` variables are already defined earlier in the component — do not redeclare them.

- [ ] **Step 5: Render the countdown badge**

In the JSX, find the `<audio>` element:

```tsx
                <audio ref={audioRef} controls className="w-full max-w-sm" />
```

Replace with:

```tsx
                <audio ref={audioRef} controls className="w-full max-w-sm" />
                {canAct && timeLeft !== null && timeLeft > 0 && (
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      timeLeft <= 10 ? "text-red-400" : "text-neutral-400"
                    }`}
                  >
                    {timeLeft}s remaining
                  </p>
                )}
```

- [ ] **Step 6: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add "app/online/[code]/OnlineGame.tsx"
git commit -m "feat: add in-game countdown timer with auto end-turn"
```
