import Link from "next/link";
import Image from "next/image";
import { listPlaylists } from "@/lib/playlists";
import { deletePlaylistAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const playlists = await listPlaylists();

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Playlists</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {playlists.length} playlist{playlists.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/playlists/new"
          className="rounded-lg bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-semibold hover:bg-white"
        >
          + New playlist
        </Link>
      </div>

      {playlists.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          No playlists yet.{" "}
          <Link href="/admin/playlists/new" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {playlists.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3"
            >
              {p.cover_image_url ? (
                <Image
                  src={p.cover_image_url}
                  alt=""
                  width={56}
                  height={56}
                  className="rounded-lg object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-neutral-800 flex-shrink-0 flex items-center justify-center text-2xl">
                  🎵
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                {p.description && (
                  <p className="text-sm text-neutral-400 truncate">
                    {p.description}
                  </p>
                )}
                <p className="text-xs text-neutral-600 mt-0.5">
                  {p.song_count} song{p.song_count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/playlists/${p.id}`}
                  className="text-xs text-neutral-300 hover:text-white px-2 py-1 border border-neutral-700 rounded"
                >
                  Edit
                </Link>
                <form action={deletePlaylistAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-300 hover:text-red-200 px-2 py-1"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
