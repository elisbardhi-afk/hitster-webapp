import Image from "next/image";
import { listSongs } from "@/lib/songs";
import { deleteSongAction, updateYearAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const songs = await listSongs();

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Song catalog</h1>
        <p className="text-sm text-neutral-400">{songs.length} song{songs.length === 1 ? "" : "s"}</p>
      </div>

      {songs.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          No songs yet. <a href="/admin/songs/new" className="underline">Add one</a> or{" "}
          <a href="/admin/songs/bulk" className="underline">bulk import</a> a list.
        </p>
      ) : (
        <ul className="grid gap-2">
          {songs.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3"
            >
              {s.album_art_url ? (
                <Image
                  src={s.album_art_url}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded bg-neutral-800" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.title}</p>
                <p className="text-sm text-neutral-400 truncate">{s.artist}</p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-widest text-neutral-500 border border-neutral-800 rounded px-1.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <form action={updateYearAction} className="flex items-center gap-1">
                <input type="hidden" name="id" value={s.id} />
                <input
                  type="number"
                  name="year"
                  defaultValue={s.release_year}
                  min={1900}
                  max={2100}
                  className="w-20 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-center"
                  aria-label={`Year for ${s.title}`}
                />
                <button
                  type="submit"
                  className="text-xs text-neutral-300 hover:text-white px-2 py-1 border border-neutral-700 rounded"
                  title="Save year"
                >
                  Save
                </button>
              </form>
              <form action={deleteSongAction}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="text-xs text-red-300 hover:text-red-200 px-2 py-1"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
