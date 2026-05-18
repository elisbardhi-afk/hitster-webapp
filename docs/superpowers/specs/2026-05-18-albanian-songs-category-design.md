# Albanian Songs Category — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

## Overview

Add a named "Albanian Songs" category that players can select when creating an online room. It works as a combinable filter alongside the existing decade filters: both must match for a song to enter the draw pile.

## Data & Types

- **Song tagging:** Albanian songs are marked using the existing `songs.tags` (`text[]`) DB field — no schema migration needed. Albanian songs have `"albanian"` in their `tags` array, set via the existing admin import UI.
- **GameState:** Add one optional field to `GameState` in `lib/game-rules-types.ts`:
  ```typescript
  categoryFilter?: string[]  // e.g. ["albanian"]
  ```
  Persisted inside the existing `games.state` JSONB column — no DB migration. Absent or empty means no category restriction.

## Filtering Logic

In `lib/games.ts`, `startRoom()` applies two independent filters (both must pass):

```typescript
songs.filter(s => {
  const decadeOk = tagFilter.length === 0 || tagFilter.includes(decadeOf(s.release_year));
  const categoryOk = categoryFilter.length === 0 || s.tags.some(t => categoryFilter.includes(t));
  return decadeOk && categoryOk;
});
```

- Empty `categoryFilter` → no category restriction (full catalog)
- `["albanian"]` → only songs tagged `"albanian"`
- Combined with decade filter: song must satisfy both (AND logic)
- Existing minimum-songs validation runs after filtering; an impossible combination surfaces as an error to the user

## UI — Room Creation Page

In `app/online/new/page.tsx`, a new **Category** section appears above the existing decade checkboxes, styled identically (fuchsia checkbox style). Contains a single "Albanian Songs" checkbox.

```
┌─────────────────────────────────┐
│  Category                       │
│  ☐ Albanian Songs               │
│                                 │
│  Decades                        │
│  ☐ 1980s  ☐ 1990s  ☐ 2000s ... │
└─────────────────────────────────┘
```

The form submits `categoryFilter` as a multi-value field (same pattern as decade `tags` today). The server action handling room creation reads `categoryFilter` from form data and passes it into `startRoom()`.

## Affected Files

| File | Change |
|------|--------|
| `lib/game-rules-types.ts` | Add `categoryFilter?: string[]` to `GameState` |
| `lib/games.ts` | Update `startRoom()` filtering + accept `categoryFilter` param |
| `app/online/new/page.tsx` | Add Category section with Albanian Songs checkbox |
| `app/online/new/actions.ts` | Read and pass `categoryFilter` from form data |

## Out of Scope

- DB migrations (none required)
- Admin UI for managing categories (tags are set at import time)
- QR mode category filtering
- Adding additional named categories beyond Albanian Songs
