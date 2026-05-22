import Link from "next/link";
import { MyRooms } from "@/components/MyRooms";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-8">
      <header className="text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
          HITSTER
        </h1>
<p className="mt-6 max-w-md text-neutral-300">
          Guess the year. Build your timeline. First to 10 wins.
        </p>
      </header>

      <div className="grid gap-4 w-full max-w-md">
        <Link
          href="/online/new"
          className="rounded-2xl bg-neutral-100 text-neutral-900 px-6 py-5 text-center font-semibold hover:bg-white transition"
        >
          Start a game
          <span className="block text-xs font-normal text-neutral-600 mt-1">
            Pick songs, mode, and players
          </span>
        </Link>
        <Link
          href="/online/join"
          className="rounded-2xl border border-neutral-700 text-neutral-100 px-6 py-4 text-center font-semibold hover:bg-neutral-900 transition"
        >
          Join with room code
          <span className="block text-xs font-normal text-neutral-400 mt-1">
            Enter a 4-letter code
          </span>
        </Link>
        <Link
          href="/qr"
          className="rounded-2xl border border-neutral-800 text-neutral-300 px-6 py-3 text-center text-sm hover:bg-neutral-900 transition"
        >
          Use printed QR cards instead →
        </Link>
      </div>

      <MyRooms />
    </main>
  );
}
