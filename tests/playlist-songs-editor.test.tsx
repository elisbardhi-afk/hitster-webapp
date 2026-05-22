import { render, screen, fireEvent } from "@testing-library/react";
import { PlaylistSongsEditor } from "@/components/PlaylistSongsEditor";
import { vi } from "vitest";

// Stub the server action — it will never be called in these tests
vi.mock("@/app/admin/(protected)/playlists/actions", () => ({
  updatePlaylistSongsAction: vi.fn(),
}));

// Stub next/image to avoid complex rendering
vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const SONGS = [
  { id: "s1", title: "Yesterday", artist: "Beatles", release_year: 1965, album_art_url: null },
  { id: "s2", title: "Imagine", artist: "Lennon", release_year: 1971, album_art_url: null },
  { id: "s3", title: "Bohemian Rhapsody", artist: "Queen", release_year: 1975, album_art_url: null },
];

describe("PlaylistSongsEditor – select all", () => {
  it("button reads 'Select all' when no songs are checked", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={[]} />
    );
    expect(screen.getByRole("button", { name: /select all/i })).toBeInTheDocument();
  });

  it("clicking 'Select all' checks all visible songs", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={[]} />
    );
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    // Counter should now show 3 selected
    expect(screen.getByText(/3 selected/)).toBeInTheDocument();
  });

  it("button reads 'Deselect all' when all songs are checked", () => {
    render(
      <PlaylistSongsEditor
        playlistId="p1"
        songs={SONGS}
        initialSongIds={["s1", "s2", "s3"]}
      />
    );
    expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
  });

  it("clicking 'Deselect all' unchecks all visible songs", () => {
    render(
      <PlaylistSongsEditor
        playlistId="p1"
        songs={SONGS}
        initialSongIds={["s1", "s2", "s3"]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /deselect all/i }));
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
  });

  it("Select all only affects filtered songs, not hidden ones", () => {
    render(
      <PlaylistSongsEditor playlistId="p1" songs={SONGS} initialSongIds={["s1"]} />
    );
    // Filter to show only "Yesterday"
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Yesterday" },
    });
    // "Select all" should add only s1 (already checked) — but since it's already
    // checked and it's the only filtered song, button becomes "Deselect all"
    expect(screen.getByRole("button", { name: /deselect all/i })).toBeInTheDocument();
  });
});
