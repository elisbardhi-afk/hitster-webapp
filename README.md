# Hitster

A web clone of the HITSTER board game with a curated international song catalog. Two ways to play, one shared codebase.

## Two ways to play

- **QR-scan mode (`/qr`)** — One shared device. Players scan printed QR cards with the camera, the 30-second Spotify preview plays, the active player places the card on a timeline based on the guessed release year. Closest to the original board game.
- **Online mode (`/online/new`)** — Multi-device. Create a room, share the 4-letter code, each player joins from their own phone. Songs are drawn randomly from the catalog and the game state syncs in real time across all devices.

First player to a timeline of 10 correctly-ordered songs wins.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Realtime) for catalog and online game state
- Spotify Web API (Client Credentials flow, 30-second `preview_url` mp3 clips)
- `@zxing/browser` for in-browser QR scanning
- `qrcode` for printable QR generation
- Vitest + Testing Library for unit tests

## Setup (local)

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. From the project dashboard, copy:
   - Project URL
   - `anon` public API key
   - `service_role` secret API key
3. Open the SQL editor and paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Run it.
4. Enable Realtime for the `games` table: in **Database → Replication**, add `games` to the `supabase_realtime` publication.

### 2. Create a Spotify app

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Note the Client ID and Client Secret.

### 3. Configure environment

Copy [`.env.example`](.env.example) to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
SPOTIFY_CLIENT_ID=<id>
SPOTIFY_CLIENT_SECRET=<secret>
ADMIN_PASSWORD=<pick-one>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 5. Seed the catalog

1. Go to `/admin/login` and enter your `ADMIN_PASSWORD`.
2. **Add song** — paste a Spotify track URL (e.g. `https://open.spotify.com/track/...`) and submit.
3. **Bulk import** — paste many URLs at once, one per line.
4. **QR sheet** — open and print the page; each card has a QR you can scan in QR mode.

Note: tracks with no `preview_url` on Spotify will be rejected on import (HITSTER needs the audio).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm test` | Run unit tests (rules engine) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |

## Deployment (Vercel + Supabase)

1. Push the repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new). Framework auto-detects as Next.js.
3. In **Settings → Environment Variables**, add all the values from `.env.local` (use your Supabase + Spotify production credentials).
4. Set `NEXT_PUBLIC_BASE_URL` to your Vercel production URL (e.g. `https://hitster.vercel.app`).
5. Deploy. The build runs automatically. The first time, Supabase Realtime subscriptions and Spotify API calls happen on first use.

The Supabase free tier (500 MB DB + 2 GB bandwidth + Realtime included) is plenty for a few games.

## Repo layout

```
app/
├─ page.tsx                          landing page (mode picker)
├─ qr/                               QR-scan mode (single-device)
│   ├─ page.tsx
│   └─ QrGame.tsx                    client-side game container
├─ online/
│   ├─ new/                          create room
│   ├─ join/                         join room
│   └─ [code]/                       room (lobby + game)
│       ├─ page.tsx
│       ├─ OnlineGame.tsx            client-side game + Realtime
│       └─ actions.ts                server actions (place/skip/buy/end-turn)
├─ admin/
│   ├─ login/                        password gate
│   └─ (protected)/                  auth-required catalog management
│       ├─ page.tsx                  list / delete
│       ├─ songs/new/                add one
│       ├─ songs/bulk/               add many
│       └─ qr-sheet/                 printable QR cards
└─ api/admin/logout/                 logout route
components/
├─ TimelineRow.tsx                   horizontal timeline with insertion slots
├─ CardFlip.tsx                      front/back animated card
├─ PlayerBar.tsx                     players + active turn highlight
├─ TokenBar.tsx                      skip/buy actions
└─ QrScanner.tsx                     camera + zxing decoder
lib/
├─ supabase.ts                       browser + server clients
├─ auth.ts                           admin password + session
├─ spotify.ts                        Spotify Client Credentials
├─ songs.ts                          songs CRUD
├─ games.ts                          rooms CRUD + lifecycle
├─ qrcode.ts                         QR generation + payload parsing
├─ game-rules.ts                     pure rules engine (40 unit tests)
└─ game-rules-types.ts               types and constants
supabase/migrations/0001_init.sql    full DB schema
tests/game-rules.test.ts             rules engine unit tests
```

## What's implemented

- Both game modes end-to-end (lobby, gameplay, win screens)
- All four rule variants: Original, PRO, Expert, Co-op (engine-level)
- Tokens: skip, buy a card, awarded title+artist bonus
- Admin catalog management with Spotify import and printable QR sheets
- Real-time multi-device sync via Supabase Realtime
- Resume saved QR-mode game from `localStorage`
- Deterministic shuffling for reproducible games

## What's deferred (post-MVP polish)

- **Challenge UI in online mode** — the engine supports challenges; UI buttons aren't wired up yet (one player presses Challenge between submit and reveal).
- **Title/artist prompt UI** — PRO and Expert variants require self-judged title/artist correctness, but the prompt UI isn't wired in the in-game flow. Currently those variants fall back to placement-only.
- **60-second turn timeout** — `turnStartedAt` is tracked in state but no automatic timeout fires yet.
- **Playwright E2E tests** — unit tests are complete; E2E suite is documented but not implemented.
- **Mobile-specific polish** — works on mobile browsers but could use additional touch-target tweaks.
