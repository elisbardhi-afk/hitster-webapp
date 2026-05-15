type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    release_date: string;
    release_date_precision: "year" | "month" | "day";
    images: { url: string; width: number; height: number }[];
  };
  preview_url: string | null;
};

export type SongMetadata = {
  spotifyId: string;
  title: string;
  artist: string;
  releaseYear: number;
  previewUrl: string;
  albumArtUrl: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials are not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export function extractTrackId(input: string): string | null {
  const trimmed = input.trim();
  // spotify:track:ID
  const uriMatch = trimmed.match(/^spotify:track:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];
  // https://open.spotify.com/track/ID?...  (also handles localized prefixes like /intl-de/)
  const urlMatch = trimmed.match(
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/,
  );
  if (urlMatch) return urlMatch[1];
  // raw ID (22 base62 chars)
  if (/^[A-Za-z0-9]{20,30}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Fallback for tracks where the Track API returns preview_url: null.
 * Spotify silently dropped preview_url from a lot of tracks in late 2024,
 * but the embed page still serves the same 30-second mp3.
 */
async function fetchPreviewFromEmbed(trackId: string): Promise<string | null> {
  const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
    headers: {
      // Avoid getting a stripped mobile/bot response
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();

  // Look for "audioPreview":{"url":"https://p.scdn.co/mp3-preview/..."}
  const m = html.match(/"audioPreview"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/);
  if (m) return decodeURIComponent(m[1].replace(/\\u002F/g, "/"));

  // Older format: "previewUrl":"https://..."
  const m2 = html.match(/"previewUrl"\s*:\s*"([^"]+)"/);
  if (m2) return decodeURIComponent(m2[1].replace(/\\u002F/g, "/"));

  return null;
}

export async function fetchTrack(trackId: string): Promise<SongMetadata> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error(`Track ${trackId} not found on Spotify`);
  }
  if (!res.ok) {
    throw new Error(`Spotify track fetch failed: ${res.status}`);
  }
  const track = (await res.json()) as SpotifyTrack;

  // Resolve a working preview URL: prefer the API, fall back to embed page.
  let previewUrl = track.preview_url ?? null;
  if (!previewUrl) {
    previewUrl = await fetchPreviewFromEmbed(track.id);
  }
  if (!previewUrl) {
    throw new Error(
      `Track "${track.name}" has no preview URL on Spotify and cannot be added`,
    );
  }

  const year = parseInt(track.album.release_date.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    throw new Error(`Could not parse release year from ${track.album.release_date}`);
  }

  const albumArtUrl =
    track.album.images.find((img) => img.width >= 200)?.url ??
    track.album.images[0]?.url ??
    null;

  return {
    spotifyId: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    releaseYear: year,
    previewUrl,
    albumArtUrl,
  };
}
