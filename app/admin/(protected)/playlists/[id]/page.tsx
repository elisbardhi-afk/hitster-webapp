import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPlaylist, listPlaylistSongIds } from "@/lib/playlists";
import { listSongs } from "@/lib/songs";
import { updatePlaylistAction } from "../actions";
import { PlaylistSongsEditor } from "@/components/PlaylistSongsEditor";

export const dynamic = "force-dynamic";

export default async function EditPlaylistPage({
  params,
}: {
  params: { id: string };
}) {
  const [playlist, songs, songIds] = await Promise.all([
    getPlaylist(params.id),
    listSongs(),
    listPlaylistSongIds(params.id),
  ]);

  if (!playlist) notFound();

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/playlists"
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← Playlists
      </Link>

      <h1 className="text-2xl font-semibold">{playlist.name}</h1>

      {/* Details panel */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Playlist details
        </p>
        <form action={updatePlaylistAction} className="space-y-3">
          <input type="hidden" name="id" value={playlist.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-neutral-300">Name</span>
              <input
                name="name"
                required
                defaultValue={playlist.name}
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </label>
            <label className="block">
              <span className="text-sm text-neutral-300">Description</span>
              <input
                name="description"
                defaultValue={playlist.description}
                maxLength={200}
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </label>
          </div>
          <div className="flex items-end gap-3">
            <label className="block flex-1">
              <span className="text-sm text-neutral-300">Cover image URL</span>
              <input
                name="cover_image_url"
                type="url"
                defaultValue={playlist.cover_image_url ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </label>
            {playlist.cover_image_url && (
              <Image
                src={playlist.cover_image_url}
                alt="Cover preview"
                width={48}
                height={48}
                className="rounded-lg object-cover flex-shrink-0 mb-0.5"
                unoptimized
              />
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-neutral-100 text-neutral-900 px-3 py-1.5 text-sm font-semibold hover:bg-white"
            >
              Save details
            </button>
          </div>
        </form>
      </div>

      {/* Songs panel */}
      <PlaylistSongsEditor
        playlistId={playlist.id}
        songs={songs}
        initialSongIds={songIds}
      />
    </main>
  );
}
