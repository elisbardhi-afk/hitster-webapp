# Albanian Songs Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a combinable "Albanian Songs" category filter to the room creation page so players can restrict their draw pile to Albanian-tagged songs, optionally combined with decade filters.

**Architecture:** Extract a pure `filterSongs` helper into a new `lib/song-filter.ts` (no Supabase dependency — testable in isolation). Add `categoryFilter?: string[]` to `GameState`. Wire the new field through `createRoom()`, `startRoom()`, and the form action. Add a Category checkbox section to the room creation UI above the existing decade checkboxes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/song-filter.ts` | Create | Pure `decadeOf` + `filterSongs` — no Supabase, fully testable |
| `lib/songs.ts` | Modify | Re-export `decadeOf` from `./song-filter` (remove local definition) |
| `lib/game-rules-types.ts` | Modify | Add `categoryFilter?: string[]` to `GameState` |
| `lib/games.ts` | Modify | Import `filterSongs`, update `createRoom()` + `startRoom()` |
| `app/online/new/actions.ts` | Modify | Read `categoryFilter` from form data, pass to `createRoom()` |
| `app/online/new/page.tsx` | Modify | Add Category fieldset above Decades fieldset |
| `tests/song-filter.test.ts` | Create | Unit tests for `filterSongs` |

---

## Task 1: Write failing tests for `filterSongs`

**Files:**
- Create: `tests/song-filter.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// tests/song-filter.test.ts
import { describe, it, expect } from "vitest";
import { filterSongs } from "@/lib/song-filter";
import type { Song } from "@/lib/songs";

function makeSong(release_year: number, tags: string[]): Song {
  return {
    id: "id",
    spotify_id: "sid",
    title: "T",
    artist: "A",
    release_year,
    preview_url: "https://example.com/p.mp3",
    album_art_url: null,
    added_at: "2024-01-01T00:00:00Z",
    tags,
  };
}

const ALBANIAN_2000 = makeSong(2003, ["albanian"]);
const ALBANIAN_1990 = makeSong(1995, ["albanian"]);
const GLOBAL_2000   = makeSong(2001, []);
const GLOBAL_1980   = makeSong(1985, []);
const ALL_SONGS = [ALBANIAN_2000, ALBANIAN_1990, GLOBAL_2000, GLOBAL_1980];

describe("filterSongs", () => {
  it("returns all songs when both filters are empty", () => {
    expect(filterSongs(ALL_SONGS, [], [])).toEqual(ALL_SONGS);
  });

  it("filters by decade only", () => {
    const result = filterSongs(ALL_SONGS, ["2000s"], []);
    expect(result).toEqual([ALBANIAN_2000, GLOBAL_2000]);
  });

  it("filters by category only", () => {
    const result = filterSongs(ALL_SONGS, [], ["albanian"]);
    expect(result).toEqual([ALBANIAN_2000, ALBANIAN_1990]);
  });

  it("applies both filters with AND logic (albanian + 2000s)", () => {
    const result = filterSongs(ALL_SONGS, ["2000s"], ["albanian"]);
    expect(result).toEqual([ALBANIAN_2000]);
  });

  it("returns empty array when no songs match both filters", () => {
    const result = filterSongs(ALL_SONGS, ["1920s"], ["albanian"]);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests — expect import failure**

```bash
npx vitest run tests/song-filter.test.ts
```

Expected output: error — `Cannot find module '@/lib/song-filter'`

---

## Task 2: Implement `lib/song-filter.ts`

**Files:**
- Create: `lib/song-filter.ts`
- Modify: `lib/songs.ts:37-39`

- [ ] **Step 1: Create `lib/song-filter.ts`**

```typescript
// lib/song-filter.ts
import type { Song } from "./songs";

export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export function filterSongs(
  songs: Song[],
  tagFilter: string[],
  categoryFilter: string[],
): Song[] {
  return songs.filter((s) => {
    const decadeOk =
      tagFilter.length === 0 || tagFilter.includes(decadeOf(s.release_year));
    const categoryOk =
      categoryFilter.length === 0 || s.tags.some((t) => categoryFilter.includes(t));
    return decadeOk && categoryOk;
  });
}
```

- [ ] **Step 2: Replace `decadeOf` definition in `lib/songs.ts` with a re-export**

In `lib/songs.ts`, replace lines 37–39:
```typescript
export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}
```
with:
```typescript
export { decadeOf } from "./song-filter";
```

- [ ] **Step 3: Run the tests — expect all 5 to pass**

```bash
npx vitest run tests/song-filter.test.ts
```

Expected output:
```
✓ tests/song-filter.test.ts (5)
  ✓ filterSongs > returns all songs when both filters are empty
  ✓ filterSongs > filters by decade only
  ✓ filterSongs > filters by category only
  ✓ filterSongs > applies both filters with AND logic (albanian + 2000s)
  ✓ filterSongs > returns empty array when no songs match both filters

Test Files  1 passed (1)
Tests       5 passed (5)
```

- [ ] **Step 4: Run the full test suite to verify no regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/song-filter.ts lib/songs.ts tests/song-filter.test.ts
git commit -m "feat: extract filterSongs helper with decade+category AND logic"
```

---

## Task 3: Add `categoryFilter` to `GameState`

**Files:**
- Modify: `lib/game-rules-types.ts:36`

- [ ] **Step 1: Add the new field after `tagFilter`**

In `lib/game-rules-types.ts`, after the line:
```typescript
  /** Online-only: tags chosen at room creation. Empty array = no filter (use full catalog). */
  tagFilter?: string[];
```
add:
```typescript
  /** Online-only: named categories chosen at room creation (e.g. ["albanian"]). Empty = no filter. */
  categoryFilter?: string[];
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (type-only change, no logic affected).

- [ ] **Step 3: Commit**

```bash
git add lib/game-rules-types.ts
git commit -m "feat: add categoryFilter to GameState type"
```

---

## Task 4: Update `createRoom()` and `startRoom()` in `lib/games.ts`

**Files:**
- Modify: `lib/games.ts`

- [ ] **Step 1: Update the import at the top of `lib/games.ts`**

Replace:
```typescript
import { decadeOf, listSongs } from "./songs";
```
with:
```typescript
import { listSongs } from "./songs";
import { filterSongs } from "./song-filter";
```

- [ ] **Step 2: Add `categoryFilter` to `createRoom()`'s opts type (line 27)**

Replace:
```typescript
export async function createRoom(opts: {
  hostNickname: string;
  variant: Variant;
  deviceMode: DeviceMode;
  tagFilter: string[];
}): Promise<GameRow> {
```
with:
```typescript
export async function createRoom(opts: {
  hostNickname: string;
  variant: Variant;
  deviceMode: DeviceMode;
  tagFilter: string[];
  categoryFilter: string[];
}): Promise<GameRow> {
```

- [ ] **Step 3: Store `categoryFilter` in the initial `GameState` (around line 62)**

In the `initialState` object inside `createRoom()`, after:
```typescript
    tagFilter: opts.tagFilter,
```
add:
```typescript
    categoryFilter: opts.categoryFilter,
```

- [ ] **Step 4: Replace the filtering block in `startRoom()` (lines 135–148)**

Replace:
```typescript
  const allSongs = await listSongs();
  const wantedDecades = room.state.tagFilter ?? [];
  const songs =
    wantedDecades.length === 0
      ? allSongs
      : allSongs.filter((s) => wantedDecades.includes(decadeOf(s.release_year)));

  if (songs.length < room.state.players.length + 1) {
    throw new Error(
      wantedDecades.length === 0
        ? "Not enough songs in catalog"
        : `Not enough songs in the selected decades (${wantedDecades.join(", ")}). Need at least ${room.state.players.length + 1}, found ${songs.length}.`,
    );
  }
```
with:
```typescript
  const allSongs = await listSongs();
  const wantedDecades = room.state.tagFilter ?? [];
  const wantedCategories = room.state.categoryFilter ?? [];
  const songs = filterSongs(allSongs, wantedDecades, wantedCategories);

  if (songs.length < room.state.players.length + 1) {
    const filters: string[] = [];
    if (wantedDecades.length > 0) filters.push(`decades: ${wantedDecades.join(", ")}`);
    if (wantedCategories.length > 0) filters.push(`categories: ${wantedCategories.join(", ")}`);
    throw new Error(
      filters.length === 0
        ? "Not enough songs in catalog"
        : `Not enough songs for the selected filters (${filters.join("; ")}). Need at least ${room.state.players.length + 1}, found ${songs.length}.`,
    );
  }
```

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/games.ts
git commit -m "feat: apply categoryFilter alongside tagFilter in startRoom"
```

---

## Task 5: Update the server action to read `categoryFilter`

**Files:**
- Modify: `app/online/new/actions.ts`

- [ ] **Step 1: Read `categoryFilter` from form data**

In `app/online/new/actions.ts`, after:
```typescript
  const tagFilter = formData
    .getAll("tags")
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0);
```
add:
```typescript
  const categoryFilter = formData
    .getAll("categoryFilter")
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0);
```

- [ ] **Step 2: Pass `categoryFilter` to `createRoom()`**

In the `createRoom()` call, after:
```typescript
      tagFilter,
```
add:
```typescript
      categoryFilter,
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/online/new/actions.ts
git commit -m "feat: read categoryFilter from room creation form"
```

---

## Task 6: Add Category UI section to the room creation page

**Files:**
- Modify: `app/online/new/page.tsx`

- [ ] **Step 1: Add the Category fieldset above the Decades fieldset**

In `app/online/new/page.tsx`, before the existing `<fieldset>` that has `<legend>Decades</legend>`:
```tsx
        <fieldset className="space-y-2">
          <legend className="text-sm text-neutral-300">Category</legend>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-900 has-[:checked]:border-fuchsia-400 has-[:checked]:bg-fuchsia-400/10 has-[:checked]:text-fuchsia-100">
              <input
                type="checkbox"
                name="categoryFilter"
                value="albanian"
                className="hidden"
              />
              <span>Albanian Songs</span>
            </label>
          </div>
        </fieldset>
```

- [ ] **Step 2: Verify the page renders correctly**

Start the dev server and visit `http://localhost:3000/online/new`. Confirm:
- "Category" section appears above "Decades"
- "Albanian Songs" checkbox renders with the same pill style as decade checkboxes
- Clicking it toggles the fuchsia selected style
- Decade checkboxes still work independently

```bash
npm run dev
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/online/new/page.tsx
git commit -m "feat: add Albanian Songs category checkbox to room creation"
```
