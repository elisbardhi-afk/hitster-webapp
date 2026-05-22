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
