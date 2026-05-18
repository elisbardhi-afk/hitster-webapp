import type { Song } from "./songs";

export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export function filterSongs(
  songs: Song[],
  tagFilter: string[],
  categoryFilter: string[],
): Song[] {
  return songs.filter((s) => {
    const decadeOk =
      tagFilter.length === 0 || tagFilter.includes(decadeOf(s.release_year));
    const categoryOk =
      categoryFilter.length === 0 || s.tags.some((t) => categoryFilter.includes(t));
    return decadeOk && categoryOk;
  });
}
