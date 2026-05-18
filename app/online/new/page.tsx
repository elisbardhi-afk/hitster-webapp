import Link from "next/link";
import { createRoomAction } from "./actions";
import { listDecades } from "@/lib/songs";
import { GameModeSelect } from "@/components/GameModeSelect";
import { DeviceModeSelect } from "@/components/DeviceModeSelect";

export const dynamic = "force-dynamic";

export default async function CreateOnlineRoomPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const decades = await listDecades();
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

        <fieldset className="space-y-2">
          <legend className="text-sm text-neutral-300">Decades</legend>
          {decades.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No songs in the catalog yet — ask an admin to add some.
            </p>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                Tick the decades you want in the draw pile. Leave all unchecked
                for every decade.
              </p>
              <div className="flex flex-wrap gap-2">
                {decades.map((d) => (
                  <label
                    key={d}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-900 has-[:checked]:border-fuchsia-400 has-[:checked]:bg-fuchsia-400/10 has-[:checked]:text-fuchsia-100"
                  >
                    <input
                      type="checkbox"
                      name="tags"
                      value={d}
                      className="hidden"
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </fieldset>

        <DeviceModeSelect />
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-semibold hover:bg-white"
        >
          Create room
        </button>
        {searchParams.error && (
          <p className="text-sm text-red-400">{decodeURIComponent(searchParams.error)}</p>
        )}
      </form>
    </main>
  );
}
