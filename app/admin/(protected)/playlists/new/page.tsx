import Link from "next/link";
import { createPlaylistAction } from "../actions";

export default function NewPlaylistPage() {
  return (
    <main className="p-6 max-w-lg mx-auto">
      <Link
        href="/admin/playlists"
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← Playlists
      </Link>
      <h1 className="text-2xl font-semibold mt-3 mb-6">New playlist</h1>
      <form action={createPlaylistAction} className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-300">Name</span>
          <input
            name="name"
            required
            autoFocus
            maxLength={80}
            placeholder="e.g. Albanian Hits"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-300">Description</span>
          <input
            name="description"
            maxLength={200}
            placeholder="Short description (optional)"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-300">Cover image URL</span>
          <input
            name="cover_image_url"
            type="url"
            placeholder="https://… (optional)"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-semibold hover:bg-white"
        >
          Create playlist
        </button>
      </form>
    </main>
  );
}
