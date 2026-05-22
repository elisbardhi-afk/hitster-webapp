# UI Improvements Design
**Date:** 2026-05-22

## Overview
Three focused UI improvements to the Hitster webapp:
1. Remove the admin button from the homepage
2. Add a "Select all" toggle to the playlist song editor
3. Add a per-turn timer option to room creation

---

## 1. Remove Admin Button

**File:** `app/page.tsx`

Remove the `<footer>` block (lines 47–51) that renders a link to `/admin`. The admin area remains accessible at `/admin` via direct URL — it just won't be discoverable from the homepage.

No other files change for this task.

---

## 2. Select All in PlaylistSongsEditor

**File:** `components/PlaylistSongsEditor.tsx`

Add a toggle button in the top bar, alongside the existing search input.

**Logic:**
- Compute `allFilteredChecked = filtered.length > 0 && filtered.every(s => checked.has(s.id))`
- If `allFilteredChecked` → button label is "Deselect all"; clicking removes all filtered song IDs from `checked`
- Otherwise → button label is "Select all"; clicking adds all filtered song IDs to `checked`
- Works correctly with or without an active search filter

**Placement:** In the existing flex row that contains the "Songs — N selected" label and the search input. The button sits between or after the search input, styled consistently with the surrounding neutral-tone UI.

---

## 3. Turn Timer

### Data Layer

**File:** `lib/game-rules-types.ts`

Add to `GameState`:
```ts
turnTimer?: 30 | 60 | null;
```
`null` means no timer. Absent field (`undefined`) is treated as no timer for backward compatibility with existing rooms.

### Room Creation Form

**New file:** `components/TimerSelect.tsx`

A `"use client"` component using the same radio-card visual style as `DeviceModeSelect`. Three options:
- **30 seconds** — fast-paced games
- **60 seconds** — standard timed
- **No limit** — untimed (default)

Renders a hidden `<input type="radio" name="turnTimer">` for each option. Default selection: `null` (No limit).

**File:** `app/online/new/page.tsx`

Add `<TimerSelect />` below `<GameModeSelect />` and above the playlist picker.

**File:** `app/online/new/actions.ts`

Read `turnTimer` from `formData`:
```ts
const rawTimer = formData.get("turnTimer");
const turnTimer = rawTimer === "30" ? 30 : rawTimer === "60" ? 60 : null;
```
Pass to `createRoom`. Validate that value is 30, 60, or null.

**File:** `lib/games.ts`

`createRoom` accepts `turnTimer?: 30 | 60 | null` and writes it into `initialState.turnTimer`.

### In-Game Timer

**File:** `app/online/[code]/OnlineGame.tsx`

**State & refs added:**
```ts
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const timerActiveRef = useRef(false); // prevents re-trigger on pause/play
```

**On new turn** (when `currentSongId` changes): reset `timerActiveRef.current = false` and `setTimeLeft(null)`.

**Audio `play` event listener** (attached in the `currentSongId` useEffect):
- If `timerActiveRef.current` is already `true`, do nothing (timer already running)
- If `state.turnTimer` is null/undefined, do nothing
- Otherwise: set `timerActiveRef.current = true`, set `timeLeft` to `state.turnTimer`

**Countdown effect** (`useEffect` depending on `timeLeft`):
```ts
if (timeLeft === null || timeLeft <= 0) return;
const id = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000);
return () => clearTimeout(id);
```
When `timeLeft` reaches 0 and `canAct` is true: call `endTurnAction` automatically.

**Display:** When `timeLeft !== null` and `canAct`, show a countdown badge near the audio player:
- > 10 s → neutral color
- ≤ 10 s → amber/red for urgency

The countdown is not shown to spectators or waiting players (only when `canAct` is true) to avoid confusion.

---

## Out of Scope
- Server-side timer enforcement (if a player closes their tab, their turn does not auto-end)
- Timer display for non-active players
- Pause/resume timer behavior — timer runs continuously once started
