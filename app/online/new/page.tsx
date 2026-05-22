import Link from "next/link";
import Image from "next/image";
import { createRoomAction } from "./actions";
import { listPlaylists } from "@/lib/playlists";
import { GameModeSelect } from "@/components/GameModeSelect";
import { DeviceModeSelect } from "@/components/DeviceModeSelect";
import { TimerSelect } from "@/components/TimerSelect";

export const dynamic = "force-dynamic";

export default async function CreateOnlineRoomPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const playlists = await listPlaylists();

  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <form
        action={createRoomAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 mt-12"
      >
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← back
        </Link>
        <h1 className="text-xl font-semibold">Create a room</h1>
        <label className="block">
          <span className="text-sm text-neutral-300">Your nickname</span>
          <input
            name="nickname"
            required
            autoFocus
            maxLength={20}
            placeholder="e.g. Ena"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <GameModeSelect />
        <TimerSelect />

        <fieldset className="space-y-2">
          <legend className="text-sm text-neutral-300">Playlist</legend>
          <p className="text-xs text-neutral-500">
            Pick a playlist for the draw pile. Leave on Full Catalog to use all
            songs.
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 cursor-pointer hover:bg-neutral-900 has-[:checked]:border-fuchsia-400 has-[:checked]:bg-fuchsia-400/10">
              <input
                type="radio"
                name="playlistId"
                value=""
                defaultChecked
                className="accent-fuchsia-400 flex-shrink-0"
              />
              <div className="w-9 h-9 rounded-lg bg-neutral-800 flex-shrink-0 flex items-center justify-center text-lg">
                🎵
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Full Catalog</p>
                <p className="text-xs text-neutral-500">All songs</p>
              </div>
            </label>

            {playlists.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 cursor-pointer hover:bg-neutral-900 has-[:checked]:border-fuchsia-400 has-[:checked]:bg-fuchsia-400/10"
              >
                <input
                  type="radio"
                  name="playlistId"
                  value={p.id}
                  className="accent-fuchsia-400 flex-shrink-0"
                />
                {p.cover_image_url ? (
                  <Image
                    src={p.cover_image_url}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-lg flex-shrink-0 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 flex-shrink-0 flex items-center justify-center text-lg">
                    🎵
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {p.description ? `${p.description} · ` : ""}
                    {p.song_count} song{p.song_count === 1 ? "" : "s"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <DeviceModeSelect />
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-semibold hover:bg-white"
        >
          Create room
        </button>
        {searchParams.error && (
          <p className="text-sm text-red-400">
            {decodeURIComponent(searchParams.error)}
          </p>
        )}
      </form>
    </main>
  );
}
