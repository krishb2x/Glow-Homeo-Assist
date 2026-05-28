/** Extract YouTube video id from common URL shapes. */
export function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        return v && /^[\w-]{6,}$/.test(v) ? v : null;
      }
      const embed = u.pathname.match(/^\/embed\/([\w-]{6,})/);
      if (embed) return embed[1]!;
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{6,})/);
      if (shorts) return shorts[1]!;
    }
  } catch {
    return null;
  }
  return null;
}

export type YouTubeOEmbed = {
  title: string;
  thumbnailUrl: string;
  channelName: string;
  descriptionPreview: string;
  durationSeconds: number | null;
};

/** Fetch title, thumbnail, channel via YouTube oEmbed (no API key). */
export async function fetchYouTubeOEmbed(sourceUrl: string): Promise<YouTubeOEmbed | null> {
  const videoId = parseYouTubeVideoId(sourceUrl);
  if (!videoId) return null;
  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: (data.title ?? "").slice(0, 500),
      thumbnailUrl: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelName: (data.author_name ?? "").slice(0, 200),
      descriptionPreview: "",
      durationSeconds: null
    };
  } catch {
    return null;
  }
}
