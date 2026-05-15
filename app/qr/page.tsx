import { listSongs } from "@/lib/songs";
import { QrGame } from "./QrGame";
import type { Card } from "@/lib/game-rules-types";

export const dynamic = "force-dynamic";

export default async function QrModePage() {
  const songs = await listSongs();
  const cards: (Card & { previewUrl: string })[] = songs.map((s) => ({
    songId: s.id,
    title: s.title,
    artist: s.artist,
    year: s.release_year,
    previewUrl: s.preview_url,
  }));

  return (
    <main className="min-h-screen p-4 sm:p-6">
      {cards.length === 0 ? (
        <div className="max-w-md mx-auto mt-24 text-center">
          <h1 className="text-xl font-semibold mb-2">No songs in the catalog yet</h1>
          <p className="text-sm text-neutral-400">
            An admin needs to add some songs before you can play.
          </p>
        </div>
      ) : (
        <QrGame cards={cards} />
      )}
    </main>
  );
}
