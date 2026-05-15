import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRoomByCode } from "@/lib/games";
import { listSongs } from "@/lib/songs";
import { OnlineGame } from "./OnlineGame";

const PLAYER_COOKIE_PREFIX = "hitster_player_";

export const dynamic = "force-dynamic";

export default async function OnlineRoomPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  const room = await getRoomByCode(code);
  if (!room) notFound();

  const playerId = cookies().get(`${PLAYER_COOKIE_PREFIX}${code}`)?.value ?? null;

  const songs = await listSongs();
  const cards = songs.map((s) => ({
    songId: s.id,
    title: s.title,
    artist: s.artist,
    year: s.release_year,
    previewUrl: s.preview_url,
  }));

  if (!playerId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <h1 className="text-xl font-semibold">Room {code}</h1>
        <p className="text-sm text-neutral-400">You haven&apos;t joined yet.</p>
        <Link
          href={`/online/join?code=${encodeURIComponent(code)}`}
          className="rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-semibold hover:bg-white"
        >
          Join with this code
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <OnlineGame
        initialRoom={room}
        playerId={playerId}
        cards={cards}
      />
    </main>
  );
}
