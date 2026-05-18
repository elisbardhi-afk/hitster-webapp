// tests/song-filter.test.ts
import { describe, it, expect } from "vitest";
import { filterSongs } from "@/lib/song-filter";
import type { Song } from "@/lib/songs";

function makeSong(release_year: number, tags: string[]): Song {
  return {
    id: "id",
    spotify_id: "sid",
    title: "T",
    artist: "A",
    release_year,
    preview_url: "https://example.com/p.mp3",
    album_art_url: null,
    added_at: "2024-01-01T00:00:00Z",
    tags,
  };
}

const ALBANIAN_2000 = makeSong(2003, ["albanian"]);
const ALBANIAN_1990 = makeSong(1995, ["albanian"]);
const GLOBAL_2000   = makeSong(2001, []);
const GLOBAL_1980   = makeSong(1985, []);
const ALL_SONGS = [ALBANIAN_2000, ALBANIAN_1990, GLOBAL_2000, GLOBAL_1980];

describe("filterSongs", () => {
  it("returns all songs when both filters are empty", () => {
    expect(filterSongs(ALL_SONGS, [], [])).toEqual(ALL_SONGS);
  });

  it("filters by decade only", () => {
    const result = filterSongs(ALL_SONGS, ["2000s"], []);
    expect(result).toEqual([ALBANIAN_2000, GLOBAL_2000]);
  });

  it("filters by category only", () => {
    const result = filterSongs(ALL_SONGS, [], ["albanian"]);
    expect(result).toEqual([ALBANIAN_2000, ALBANIAN_1990]);
  });

  it("applies both filters with AND logic (albanian + 2000s)", () => {
    const result = filterSongs(ALL_SONGS, ["2000s"], ["albanian"]);
    expect(result).toEqual([ALBANIAN_2000]);
  });

  it("returns empty array when no songs match both filters", () => {
    const result = filterSongs(ALL_SONGS, ["1920s"], ["albanian"]);
    expect(result).toEqual([]);
  });
});
