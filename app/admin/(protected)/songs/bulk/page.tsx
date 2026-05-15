import { bulkImportAction } from "./actions";

export default function BulkImportPage({
  searchParams,
}: {
  searchParams: { added?: string; failed?: string };
}) {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Bulk import</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Paste one Spotify URL, URI, or track ID per line.
      </p>
      <form action={bulkImportAction} className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Inputs</span>
          <textarea
            name="inputs"
            required
            rows={12}
            placeholder={"https://open.spotify.com/track/...\nspotify:track:..."}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-300">Tags applied to all (optional)</span>
          <input
            name="tags"
            placeholder="pop"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-semibold hover:bg-white"
        >
          Import all
        </button>
      </form>

      {searchParams.added && (
        <p className="mt-4 text-sm text-emerald-400">
          Imported {decodeURIComponent(searchParams.added)} song(s).
        </p>
      )}
      {searchParams.failed && (
        <pre className="mt-4 text-xs text-red-300 whitespace-pre-wrap">
          {decodeURIComponent(searchParams.failed)}
        </pre>
      )}
    </main>
  );
}
