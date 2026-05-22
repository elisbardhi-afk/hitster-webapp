"use client";

import { useRef } from "react";
import { deletePlaylistAction } from "@/app/admin/(protected)/playlists/actions";

export function DeletePlaylistButton({
  playlistId,
  playlistName,
}: {
  playlistId: string;
  playlistName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    if (!window.confirm(`Delete "${playlistName}"? This cannot be undone.`)) {
      e.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={deletePlaylistAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={playlistId} />
      <button
        type="submit"
        className="text-xs text-red-300 hover:text-red-200 px-2 py-1"
      >
        Delete
      </button>
    </form>
  );
}
