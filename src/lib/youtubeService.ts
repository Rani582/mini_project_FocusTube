/**
 * youtubeService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * YouTube Data API v3 integration for FocusTube AI.
 *
 * API key priority:
 *   1. import.meta.env.VITE_YOUTUBE_API_KEY  (set in a .env file)
 *   2. localStorage "focustube_yt_api_key"   (set via the in-app settings panel)
 *
 * All functions return null / [] on failure so callers can fall back gracefully.
 */

import type { Video } from "./videoData";

// ── Key storage ────────────────────────────────────────────────────────────
export const YT_KEY_STORAGE = "focustube_yt_api_key";
const YT_BASE = "https://www.googleapis.com/youtube/v3";

export function getYouTubeApiKey(): string {
  const env = (import.meta.env as Record<string, string>).VITE_YOUTUBE_API_KEY ?? "";
  if (env && env.length > 10) return env;
  return localStorage.getItem(YT_KEY_STORAGE) ?? "";
}

export function setYouTubeApiKey(key: string): void {
  localStorage.setItem(YT_KEY_STORAGE, key.trim());
}

export function clearYouTubeApiKey(): void {
  localStorage.removeItem(YT_KEY_STORAGE);
}

export function hasYouTubeApiKey(): boolean {
  return getYouTubeApiKey().length > 10;
}

/** Returns true when `id` looks like a real YouTube video ID (11 chars) */
export function isYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

// ── Error helpers ─────────────────────────────────────────────────────────
export type YTErrorCode = "invalid_key" | "quota_exceeded" | "no_results" | "network" | "unknown";

export interface YTError {
  code: YTErrorCode;
  message: string;
}

function parseYTError(status: number, body: unknown): YTError {
  const err = (body as { error?: { errors?: { reason?: string; message?: string }[] } }).error;
  const reason = err?.errors?.[0]?.reason ?? "";
  if (status === 400 || reason === "keyInvalid") {
    return { code: "invalid_key", message: "Invalid YouTube API key. Check your key in Settings." };
  }
  if (status === 403) {
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      return { code: "quota_exceeded", message: "YouTube API quota exceeded. Try again tomorrow." };
    }
    return { code: "invalid_key", message: "API key not authorized. Enable YouTube Data API v3 in Google Cloud Console." };
  }
  return { code: "unknown", message: err?.errors?.[0]?.message ?? "Unknown YouTube API error." };
}

/** Last known YouTube API error — read this to surface UI messages */
export let lastYTError: YTError | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────
/** Parse ISO 8601 duration → "m:ss" */
function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "0:00";
  const h = parseInt(m[1] ?? "0");
  const min = parseInt(m[2] ?? "0");
  const s = parseInt(m[3] ?? "0");
  const totalMin = h * 60 + min;
  const ss = s.toString().padStart(2, "0");
  return `${totalMin}:${ss}`;
}

/** Format raw view count string → "1.2M" */
function formatViews(raw: string | undefined): string {
  if (!raw) return "0";
  const n = parseInt(raw, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/** Format ISO date → "3 weeks ago" style */
function formatUploadDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? "s" : ""} ago`;
}

/** Format like count */
function formatLikes(raw: string | undefined): number {
  if (!raw) return 0;
  return parseInt(raw, 10) || 0;
}

/** Format subscriber count */
function formatSubs(raw: string | undefined): string {
  if (!raw) return "0";
  const n = parseInt(raw, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

// ── Category inference ────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Machine Learning": [
    "machine learning", "deep learning", "neural network", "tensorflow", "pytorch",
    "AI", "artificial intelligence", "scikit", "pandas", "numpy", "data science",
    "NLP", "computer vision", "transformer", "LLM", "GPT", "BERT", "reinforcement",
    "regression", "classification", "gradient", "backpropagation", "kaggle",
  ],
  "Web Development": [
    "javascript", "typescript", "react", "vue", "angular", "svelte", "next.js",
    "node.js", "html", "css", "web dev", "frontend", "backend", "fullstack",
    "API", "REST", "GraphQL", "tailwind", "webpack", "vite", "database", "SQL",
    "mongodb", "express", "flask", "django", "spring", "coding", "programming",
  ],
  "Cooking": [
    "recipe", "cook", "cooking", "bake", "baking", "food", "cuisine", "kitchen",
    "ingredient", "meal", "dish", "chef", "restaurant", "flavor", "sauce",
    "roast", "fry", "grill", "pasta", "bread", "dessert", "vegan", "breakfast",
  ],
  "Gaming": [
    "game", "gaming", "gameplay", "playthrough", "walkthrough", "esports",
    "twitch", "streamer", "console", "PC gaming", "Xbox", "PlayStation", "Nintendo",
    "Minecraft", "Fortnite", "Valorant", "review", "speedrun", "RPG", "FPS",
  ],
  "Fitness": [
    "workout", "exercise", "fitness", "gym", "training", "yoga", "HIIT",
    "weight loss", "muscle", "cardio", "strength", "stretching", "running",
    "bodybuilding", "nutrition", "diet", "health", "wellness", "pilates",
  ],
  "Music": [
    "music", "song", "guitar", "piano", "drums", "bass", "vocalist", "singing",
    "beat", "producer", "music theory", "chord", "melody", "harmony", "album",
    "cover", "tutorial music", "instrument", "studio", "record", "mix", "DJ",
  ],
  "Travel": [
    "travel", "trip", "vlog", "destination", "tour", "explore", "backpack",
    "vacation", "hotel", "flight", "adventure", "journey", "city guide",
    "road trip", "cruise", "hiking", "camping", "culture", "food travel",
  ],
  "Science": [
    "science", "physics", "chemistry", "biology", "space", "astronomy",
    "quantum", "experiment", "research", "climate", "environment", "evolution",
    "genetics", "atom", "particle", "gravity", "telescope", "NASA", "lab",
  ],
};

type KnownCategory =
  | "Machine Learning"
  | "Web Development"
  | "Cooking"
  | "Gaming"
  | "Fitness"
  | "Music"
  | "Travel"
  | "Science";

export function inferCategory(
  title: string,
  description: string,
  tags: string[]
): KnownCategory {
  const text = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
  let best: KnownCategory = "Science";
  let bestScore = -1;
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = kws.reduce(
      (s, kw) => s + (text.includes(kw.toLowerCase()) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = cat as KnownCategory;
    }
  }
  return best;
}

// ── Raw YouTube API types ─────────────────────────────────────────────────
interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string } };
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high?: { url: string }; medium?: { url: string } };
    tags?: string[];
  };
  statistics?: { viewCount?: string; likeCount?: string; subscriberCount?: string };
  contentDetails?: { duration?: string };
}

interface YTChannelItem {
  id: string;
  snippet: { thumbnails: { default?: { url: string }; medium?: { url: string } } };
  statistics?: { subscriberCount?: string };
}

// ── Map a YT video response item to our Video shape ───────────────────────
function mapToVideo(
  id: string,
  snippet: YTVideoItem["snippet"],
  stats?: YTVideoItem["statistics"],
  contentDetails?: YTVideoItem["contentDetails"],
  channelAvatar?: string,
  channelSubs?: string
): Video {
  const tags = snippet.tags ?? [];
  const category = inferCategory(snippet.title, snippet.description, tags);
  return {
    id,
    title: snippet.title,
    description: snippet.description,
    category,
    tags: tags.slice(0, 12),
    thumbnail:
      snippet.thumbnails.high?.url ??
      snippet.thumbnails.medium?.url ??
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    duration: parseDuration(contentDetails?.duration ?? "PT0S"),
    views: formatViews(stats?.viewCount),
    likes: formatLikes(stats?.likeCount),
    channel: snippet.channelTitle,
    channelAvatar:
      channelAvatar ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(snippet.channelTitle)}&backgroundColor=4f46e5`,
    uploadedAt: formatUploadDate(snippet.publishedAt),
    subscribers: channelSubs ? `${formatSubs(channelSubs)} subscribers` : "",
  };
}

// ── Core fetch with error surfacing ──────────────────────────────────────
async function ytFetch(url: string): Promise<unknown> {
  lastYTError = null;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    lastYTError = parseYTError(res.status, body);
    throw lastYTError;
  }
  return body;
}

// ── Fetch channel avatars for a list of channel IDs ───────────────────────
async function fetchChannelMap(
  channelIds: string[],
  apiKey: string
): Promise<Record<string, { avatar: string; subs: string }>> {
  if (!channelIds.length) return {};
  const ids = [...new Set(channelIds)].join(",");
  try {
    const data = (await ytFetch(
      `${YT_BASE}/channels?part=snippet,statistics&id=${ids}&key=${apiKey}`
    )) as { items?: YTChannelItem[] };
    const map: Record<string, { avatar: string; subs: string }> = {};
    for (const ch of data.items ?? []) {
      map[ch.id] = {
        avatar:
          ch.snippet.thumbnails.medium?.url ??
          ch.snippet.thumbnails.default?.url ??
          "",
        subs: ch.statistics?.subscriberCount ?? "0",
      };
    }
    return map;
  } catch {
    return {};
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Search YouTube for videos.
 * Returns mapped Video[] or throws a YTError.
 */
export async function ytSearch(
  query: string,
  maxResults = 20,
  apiKey?: string,
  duration?: "short" | "medium" | "long"
): Promise<Video[]> {
  const key = apiKey ?? getYouTubeApiKey();
  if (!key) throw { code: "invalid_key", message: "No YouTube API key set." } as YTError;

  // 1. Search for video IDs + basic snippets
  let searchUrl = `${YT_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${key}&videoEmbeddable=true`;
  if (duration) searchUrl += `&videoDuration=${duration}`;

  const searchData = (await ytFetch(searchUrl)) as { items?: YTSearchItem[] };

  const items = searchData.items ?? [];
  if (!items.length) return [];

  const videoIds = items.map((i) => i.id.videoId).join(",");
  const channelIds = items.map((i) => i.snippet.channelId);

  // 2. Fetch full video details (duration, tags, stats)
  const detailData = (await ytFetch(
    `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${key}`
  )) as { items?: YTVideoItem[] };

  const detailMap: Record<string, YTVideoItem> = {};
  for (const v of detailData.items ?? []) detailMap[v.id] = v;

  // 3. Fetch channel info (avatars, subscriber counts)
  const channelMap = await fetchChannelMap(channelIds, key);

  // 4. Map to Video[]
  return items.map((item) => {
    const detail = detailMap[item.id.videoId];
    const ch = channelMap[item.snippet.channelId];
    return mapToVideo(
      item.id.videoId,
      detail?.snippet ?? {
        title: item.snippet.title,
        description: item.snippet.description,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
      },
      detail?.statistics,
      detail?.contentDetails,
      ch?.avatar,
      ch?.subs
    );
  });
}

/**
 * Fetch a single YouTube video by ID.
 * Returns Video or null on error.
 */
export async function ytGetVideo(
  videoId: string,
  apiKey?: string
): Promise<Video | null> {
  const key = apiKey ?? getYouTubeApiKey();
  if (!key) return null;
  try {
    const data = (await ytFetch(
      `${YT_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${key}`
    )) as { items?: YTVideoItem[] };

    const v = data.items?.[0];
    if (!v) return null;

    const channelMap = await fetchChannelMap([v.snippet.channelId], key);
    const ch = channelMap[v.snippet.channelId];
    return mapToVideo(v.id, v.snippet, v.statistics, v.contentDetails, ch?.avatar, ch?.subs);
  } catch {
    return null;
  }
}

/**
 * Get related videos for a given video (used for recommendations).
 * Searches YouTube using the video's title keywords.
 */
export async function ytGetRelated(
  video: Video,
  maxResults = 20,
  apiKey?: string
): Promise<Video[]> {
  const key = apiKey ?? getYouTubeApiKey();
  if (!key) return [];
  // Build a query from the title + top tags
  const titleWords = video.title.split(/\s+/).slice(0, 6).join(" ");
  const tagHints = video.tags.slice(0, 3).join(" ");
  const query = `${titleWords} ${tagHints}`.trim();
  try {
    const results = await ytSearch(query, maxResults + 5, key);
    // Remove current video from results
    return results.filter((v) => v.id !== video.id).slice(0, maxResults);
  } catch {
    return [];
  }
}

/**
 * Test an API key by doing a minimal search.
 * Returns null on success, or a YTError on failure.
 */
export async function validateYouTubeApiKey(key: string): Promise<YTError | null> {
  try {
    await ytFetch(
      `${YT_BASE}/videos?part=id&id=dQw4w9WgXcQ&key=${key}`
    );
    return null;
  } catch (e) {
    return e as YTError;
  }
}
