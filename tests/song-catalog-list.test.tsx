import { render, screen, fireEvent } from "@testing-library/react";
import { SongCatalogList } from "@/components/SongCatalogList";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

vi.mock("@/app/admin/(protected)/actions", () => ({
  deleteSongAction: vi.fn(),
  updateYearAction: vi.fn(),
}));

const SONGS = [
  {
    id: "s1",
    spotify_id: "sp1",
    title: "Yesterday",
    artist: "The Beatles",
    release_year: 1965,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["classic", "pop"],
  },
  {
    id: "s2",
    spotify_id: "sp2",
    title: "Imagine",
    artist: "John Lennon",
    release_year: 1971,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["classic"],
  },
  {
    id: "s3",
    spotify_id: "sp3",
    title: "Thriller",
    artist: "Michael Jackson",
    release_year: 1982,
    preview_url: "",
    album_art_url: null,
    added_at: "",
    tags: ["pop", "albanian"],
  },
];

describe("SongCatalogList – search", () => {
  it("shows all songs when query is empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Imagine")).toBeInTheDocument();
    expect(screen.getByText("Thriller")).toBeInTheDocument();
  });

  it("filters by title (case-insensitive)", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "yester" },
    });
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.queryByText("Imagine")).not.toBeInTheDocument();
    expect(screen.queryByText("Thriller")).not.toBeInTheDocument();
  });

  it("filters by artist", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "lennon" },
    });
    expect(screen.getByText("Imagine")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("filters by year", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "1982" },
    });
    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("filters by tag", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "albanian" },
    });
    expect(screen.getByText("Thriller")).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("shows filtered count when query is non-empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "classic" },
    });
    expect(screen.getByText(/2 of 3 songs/)).toBeInTheDocument();
  });

  it("shows empty state when nothing matches", () => {
    render(<SongCatalogList songs={SONGS} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch" },
    });
    expect(screen.getByText(/no songs match/i)).toBeInTheDocument();
    expect(screen.queryByText("Yesterday")).not.toBeInTheDocument();
  });

  it("does not show count line when query is empty", () => {
    render(<SongCatalogList songs={SONGS} />);
    expect(screen.queryByText(/of 3 songs/)).not.toBeInTheDocument();
  });
});
