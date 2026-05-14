/**
 * apiService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Talks to the Python FastAPI backend (http://localhost:8000).
 * Falls back to the local TypeScript ML engine if the backend is unreachable.
 *
 * To start the Python backend:
 *   cd backend
 *   pip install -r requirements.txt
 *   uvicorn main:app --reload --port 8000
 */

import { Video, VIDEOS } from "./videoData";
import {
  recommendationEngine,
  RecommendationResult,
  ModelInsight,
} from "./mlRecommendationModel";

export const PYTHON_API_URL = "http://localhost:8000";

export type BackendStatus = "checking" | "online" | "offline";

// ── Types that mirror Python Pydantic schemas ─────────────────────────────
export interface PythonRecommendationItem {
  video: Video;
  score: number;
  cosineScore: number;
  tagScore: number;
  topTerms: string[];
  sharedTags: string[];
  blocked: boolean;
  blockReason: "category_mismatch" | "low_similarity" | null;
  relation: "strong" | "moderate" | "weak" | "unrelated";
  categoryMatch: boolean;
}

export interface PythonRecommendationResponse {
  results: PythonRecommendationItem[];
  insight: ModelInsight;
}

export interface PythonHealthResponse {
  status: string;
  model: string;
  vocabulary_size: number;
  total_videos: number;
  strict_threshold: number;
  soft_threshold: number;
  backend: string;
}

export interface PythonModelInfo {
  algorithm: string;
  library: string;
  language: string;
  vocabulary_size: number;
  ngram_range: [number, number];
  max_features: number;
  sublinear_tf: boolean;
  tag_weight: number;
  title_weight: number;
  category_weight: number;
  strict_threshold: number;
  soft_threshold: number;
  total_videos: number;
  strict_mode_gates: string[];
  sample_vocabulary: string[];
}

// ── Timeout wrapper ───────────────────────────────────────────────────────
function fetchWithTimeout(url: string, ms = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

// ── Health check ──────────────────────────────────────────────────────────
export async function checkBackendHealth(): Promise<PythonHealthResponse | null> {
  try {
    const res = await fetchWithTimeout(`${PYTHON_API_URL}/health`, 2500);
    if (!res.ok) return null;
    return (await res.json()) as PythonHealthResponse;
  } catch {
    return null;
  }
}

// ── Videos ────────────────────────────────────────────────────────────────
export async function fetchVideos(
  category?: string,
  duration?: "short" | "medium" | "long"
): Promise<{ videos: Video[]; fromBackend: boolean }> {
  try {
    let url = `${PYTHON_API_URL}/videos`;
    const params = new URLSearchParams();
    if (category && category !== "All") params.append("category", category);
    if (duration) params.append("duration", duration);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error("non-ok");
    const data = await res.json();
    return { videos: data.videos as Video[], fromBackend: true };
  } catch {
    const videos = category
      ? VIDEOS.filter((v) => v.category === category)
      : VIDEOS;
    return { videos, fromBackend: false };
  }
}

export async function fetchVideo(
  videoId: string
): Promise<{ video: Video | null; fromBackend: boolean }> {
  try {
    const res = await fetchWithTimeout(`${PYTHON_API_URL}/videos/${videoId}`);
    if (!res.ok) throw new Error("non-ok");
    const video = (await res.json()) as Video;
    return { video, fromBackend: true };
  } catch {
    const video = VIDEOS.find((v) => v.id === videoId) ?? null;
    return { video, fromBackend: false };
  }
}

// ── Recommendations ───────────────────────────────────────────────────────
export async function fetchRecommendations(
  videoId: string,
  strictMode: boolean,
  maxResults = 20
): Promise<{
  results: RecommendationResult[];
  insight: ModelInsight;
  fromBackend: boolean;
}> {
  try {
    const url = `${PYTHON_API_URL}/recommendations/${videoId}?strict_mode=${strictMode}&max_results=${maxResults}`;
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) throw new Error("non-ok");
    const data = (await res.json()) as PythonRecommendationResponse;

    // Map Python response to TypeScript RecommendationResult shape
    const results: RecommendationResult[] = data.results.map((r) => ({
      video:         r.video,
      score:         r.score,
      cosineScore:   r.cosineScore ?? r.score,
      tagScore:      r.tagScore ?? 0,
      topTerms:      r.topTerms ?? [],
      sharedTags:    r.sharedTags ?? [],
      blocked:       r.blocked,
      blockReason:   r.blockReason ?? null,
      relation:      r.relation,
      categoryMatch: r.categoryMatch ?? true,
    }));

    return { results, insight: data.insight, fromBackend: true };
  } catch {
    // Fallback: TypeScript ML engine
    const { results, insight } = recommendationEngine.recommend(
      videoId,
      strictMode,
      maxResults
    );
    return { results, insight, fromBackend: false };
  }
}

// ── Search ────────────────────────────────────────────────────────────────
export async function searchVideos(
  query: string,
  duration?: "short" | "medium" | "long"
): Promise<{ videos: Video[]; fromBackend: boolean }> {
  try {
    let url = `${PYTHON_API_URL}/search?q=${encodeURIComponent(query)}`;
    if (duration) url += `&duration=${duration}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error("non-ok");
    const data = await res.json();
    return { videos: data.videos as Video[], fromBackend: true };
  } catch {
    const q = query.toLowerCase();
    const videos = VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q)) ||
        v.channel.toLowerCase().includes(q)
    );
    return { videos, fromBackend: false };
  }
}

// ── Model info ────────────────────────────────────────────────────────────
export async function fetchModelInfo(): Promise<PythonModelInfo | null> {
  try {
    const res = await fetchWithTimeout(`${PYTHON_API_URL}/model/info`);
    if (!res.ok) return null;
    return (await res.json()) as PythonModelInfo;
  } catch {
    return null;
  }
}
