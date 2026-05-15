import { addSongAction } from "./actions";

export default function AddSongPage({
  searchParams,
}: {
  searchParams: { error?: string; added?: string };
}) {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Add a song</h1>
      <form action={addSongAction} className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Spotify track URL, URI, or ID</span>
          <input
            name="spotify"
            required
            autoFocus
            placeholder="https://open.spotify.com/track/..."
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-300">Tags (comma-separated, optional)</span>
          <input
            name="tags"
            placeholder="pop, 90s"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-semibold hover:bg-white"
        >
          Import
        </button>
      </form>

      {searchParams.error && (
        <p className="mt-4 text-sm text-red-400">{decodeURIComponent(searchParams.error)}</p>
      )}
      {searchParams.added && (
        <p className="mt-4 text-sm text-emerald-400">
          Added: {decodeURIComponent(searchParams.added)}
        </p>
      )}
    </main>
  );
}
