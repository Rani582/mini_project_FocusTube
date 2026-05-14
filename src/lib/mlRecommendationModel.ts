/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  FOCUSTUBE ML RECOMMENDATION ENGINE  v2.0
 *  Algorithm: TF-IDF + Cosine Similarity + Tag Jaccard + Category Enforcement
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  How it works:
 *
 *  RELAXED MODE:
 *    • TF-IDF cosine similarity only
 *    • All 39 other videos are shown, sorted by score
 *    • No blocking at all
 *
 *  STRICT MODE ("Stay On Topic"):
 *    ┌─ Step 1: HARD CATEGORY GATE ─────────────────────────────────────┐
 *    │  Different category from the current video? → BLOCKED immediately │
 *    │  (e.g. watching Gaming → zero Fitness/Cooking/ML videos shown)   │
 *    └───────────────────────────────────────────────────────────────────┘
 *    ┌─ Step 2: COMBINED SCORE (within same category only) ─────────────┐
 *    │  combined = 0.55 × cosine_sim + 0.45 × tag_jaccard_sim          │
 *    │  tag_jaccard = |shared tags| / |union tags| + partial word bonus │
 *    │  If combined < STRICT_THRESHOLD → BLOCKED                        │
 *    └───────────────────────────────────────────────────────────────────┘
 *
 *  TF-IDF document construction (weights):
 *    • Category  × 6  (strongest signal — same topic area)
 *    • Tags       × 5  (key topic identifiers, phrase-preserved)
 *    • Title      × 2  (topic summary)
 *    • Description × 1 (context, minimal weight)
 *
 *  Phrase preservation:
 *    Multi-word tags like "machine learning" are kept as "machine_learning"
 *    so they are treated as one discriminative token, not two generic words.
 */

import { Video, VIDEOS } from "./videoData";

// ── Tuneable hyper-parameters ──────────────────────────────────────────────
const TAG_WEIGHT      = 5;   // tags are the primary topic signal
const TITLE_WEIGHT    = 2;   // title provides topic summary
const CATEGORY_WEIGHT = 6;   // strongest single signal — same category matters most

// Strict mode thresholds
export const STRICT_THRESHOLD = 0.15;  // combined score minimum for same-category pass
export const SOFT_THRESHOLD   = 0.06;  // below this → "unrelated" label in relaxed mode

// Extended stop-words (include common tutorial words that pollute cross-topic similarity)
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","do","does",
  "will","how","what","this","that","it","its","we","you","your","our",
  "all","can","get","make","use","using","more","than","i","my","me",
  "into","up","out","as","so","if","then","when","where","which","who",
  "just","about","also","very","over","after","before","between","through",
  "tips","tricks","guide","tutorial","learn","complete","full","beginner",
  "advanced","pro","best","top","new","first","second","third","every",
  "part","episode","series","video","watch","show","see","here","now",
]);

// ── Types ──────────────────────────────────────────────────────────────────
export interface RecommendationResult {
  video: Video;
  score: number;           // final score used for ranking
  cosineScore: number;     // raw TF-IDF cosine similarity
  tagScore: number;        // Jaccard tag overlap [0,1]
  topTerms: string[];      // top TF-IDF shared terms
  sharedTags: string[];    // actual tag strings shared between videos
  blocked: boolean;
  blockReason: "category_mismatch" | "low_similarity" | null;
  relation: "strong" | "moderate" | "weak" | "unrelated";
  categoryMatch: boolean;
}

export interface ModelInsight {
  vocabulary: string[];
  queryTerms: string[];
  queryTags: string[];
  queryCategory: string;
  blockedCount: number;
  allowedCount: number;
  categoryBlockedCount: number;  // blocked specifically due to wrong category
  threshold: number;
  categoryEnforced: boolean;
}

// ── Tokenizer (phrase-preserving) ──────────────────────────────────────────
/**
 * Tokenize a single string, filtering stop-words.
 * For multi-word phrases, we join words with "_" to preserve meaning.
 * "machine learning" → "machine_learning" (single discriminative token)
 */
function tokenizePhrase(phrase: string): string[] {
  const cleaned = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  if (words.length === 0) return [];
  if (words.length === 1) return words;
  // Return both the compound phrase token AND individual words
  return [words.join("_"), ...words];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/** Build a weighted document (token array) from a video */
function buildDocument(video: Video): string[] {
  const tokens: string[] = [];

  // ① Category — strongest weight (phrase-preserved)
  const catTokens = tokenizePhrase(video.category);
  for (let i = 0; i < CATEGORY_WEIGHT; i++) tokens.push(...catTokens);

  // ② Tags — high weight, phrase-preserved for multi-word tags
  for (const tag of video.tags) {
    const tagTokens = tokenizePhrase(tag);
    for (let i = 0; i < TAG_WEIGHT; i++) tokens.push(...tagTokens);
  }

  // ③ Title — medium weight
  const titleTokens = tokenize(video.title);
  for (let i = 0; i < TITLE_WEIGHT; i++) tokens.push(...titleTokens);

  // ④ Description — base weight (just once)
  tokens.push(...tokenize(video.description));

  return tokens;
}

// ── Vocabulary ────────────────────────────────────────────────────────────
function buildVocabulary(documents: string[][]): string[] {
  const vocab = new Set<string>();
  for (const doc of documents) for (const term of doc) vocab.add(term);
  return Array.from(vocab).sort();
}

// ── TF Computation ────────────────────────────────────────────────────────
function computeTF(doc: string[], vocab: string[]): number[] {
  const freq: Record<string, number> = {};
  for (const term of doc) freq[term] = (freq[term] || 0) + 1;
  const total = doc.length || 1;
  return vocab.map(term => (freq[term] || 0) / total);
}

// ── IDF Computation ───────────────────────────────────────────────────────
function computeIDF(documents: string[][], vocab: string[]): number[] {
  const N = documents.length;
  // Build a Set per document for fast membership checking
  const docSets = documents.map(d => new Set(d));
  return vocab.map(term => {
    const df = docSets.filter(s => s.has(term)).length;
    return df === 0 ? 0 : Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
  });
}

// ── TF-IDF Vector ─────────────────────────────────────────────────────────
function computeTFIDF(tf: number[], idf: number[]): number[] {
  return tf.map((t, i) => t * idf[i]);
}

// ── Cosine Similarity ─────────────────────────────────────────────────────
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Tag Jaccard Similarity ────────────────────────────────────────────────
/**
 * Computes how similar two videos are based on their TAG arrays.
 *
 * Two-level matching:
 *   Level 1: Exact tag match   (e.g., both have "machine learning")
 *   Level 2: Partial word match (e.g., "deep learning" ↔ "machine learning" share "learning")
 *
 * Returns jaccard score [0,1] and the list of shared tag strings.
 */
function computeTagJaccard(
  tagsA: string[],
  tagsB: string[]
): { jaccard: number; sharedTags: string[] } {
  const normA = tagsA.map(t => t.toLowerCase().trim());
  const normB = new Set(tagsB.map(t => t.toLowerCase().trim()));
  const setB = Array.from(normB);

  const exactShared: string[] = [];
  const partialShared: string[] = [];
  const usedB = new Set<string>();

  // Level 1: Exact tag match
  for (const tag of normA) {
    if (normB.has(tag)) {
      exactShared.push(tag);
      usedB.add(tag);
    }
  }

  // Level 2: Partial word overlap (meaningful words only, length > 3)
  for (const tagA of normA) {
    if (normB.has(tagA)) continue; // already exact-matched
    const wordsA = tagA.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    for (const tagB of setB) {
      if (usedB.has(tagB)) continue;
      const wordsB = tagB.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      const overlap = wordsA.filter(w => wordsB.includes(w));
      if (overlap.length > 0) {
        partialShared.push(`${tagA} ≈ ${tagB}`);
        usedB.add(tagB);
        break;
      }
    }
  }

  const allShared = [...exactShared, ...partialShared];
  const union = new Set([...normA, ...setB]);

  // Exact matches count fully; partial matches count at 0.5 weight
  const numerator = exactShared.length + partialShared.length * 0.5;
  const jaccard = union.size === 0 ? 0 : numerator / union.size;

  return { jaccard: Math.min(jaccard, 1.0), sharedTags: allShared };
}

// ── Relation label ────────────────────────────────────────────────────────
function getRelation(score: number, strictMode: boolean): RecommendationResult["relation"] {
  if (strictMode) {
    if (score >= 0.50) return "strong";
    if (score >= 0.30) return "moderate";
    if (score >= STRICT_THRESHOLD) return "weak";
    return "unrelated";
  } else {
    if (score >= 0.45) return "strong";
    if (score >= 0.20) return "moderate";
    if (score >= SOFT_THRESHOLD) return "weak";
    return "unrelated";
  }
}

// ── Top shared TF-IDF terms (for insight UI) ──────────────────────────────
function getTopSharedTerms(
  queryVec: number[],
  candidateVec: number[],
  vocab: string[],
  topN = 6
): string[] {
  return vocab
    .map((term, i) => ({ term, score: queryVec[i] * candidateVec[i] }))
    .filter(x => x.score > 0 && !x.term.includes("_")) // prefer readable single words
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.term);
}

// ── Main ML Engine ─────────────────────────────────────────────────────────
export class FocusTubeRecommendationEngine {
  private vocabulary: string[];
  private idf: number[];
  private tfidfVectors: Map<string, number[]>;

  constructor(videos: Video[]) {
    const docMap = new Map<string, string[]>();
    for (const v of videos) docMap.set(v.id, buildDocument(v));

    this.vocabulary = buildVocabulary(Array.from(docMap.values()));
    this.idf = computeIDF(Array.from(docMap.values()), this.vocabulary);

    this.tfidfVectors = new Map<string, number[]>();
    for (const [id, doc] of docMap.entries()) {
      const tf    = computeTF(doc, this.vocabulary);
      const tfidf = computeTFIDF(tf, this.idf);
      this.tfidfVectors.set(id, tfidf);
    }
  }

  /**
   * Recommend videos for a given video.
   *
   * STRICT MODE — Two gates:
   *   1. Hard category gate: different category → blocked immediately
   *   2. Combined score gate: combined = 0.55×cosine + 0.45×tagJaccard < threshold → blocked
   *
   * RELAXED MODE:
   *   • Pure cosine similarity score, sorted descending, nothing blocked
   */
  recommend(
    videoId: string,
    strictMode: boolean,
    maxResults = 20
  ): { results: RecommendationResult[]; insight: ModelInsight } {
    const queryVec  = this.tfidfVectors.get(videoId);
    const queryVideo = VIDEOS.find(v => v.id === videoId);

    if (!queryVec || !queryVideo) {
      return { results: [], insight: this.emptyInsight(strictMode) };
    }

    const results: RecommendationResult[] = [];

    for (const [id, vec] of this.tfidfVectors.entries()) {
      if (id === videoId) continue;

      const candidateVideo = VIDEOS.find(v => v.id === id)!;
      const cosineScore    = cosineSim(queryVec, vec);
      const { jaccard: tagScore, sharedTags } = computeTagJaccard(
        queryVideo.tags,
        candidateVideo.tags
      );
      const topTerms     = getTopSharedTerms(queryVec, vec, this.vocabulary);
      const categoryMatch = queryVideo.category === candidateVideo.category;

      let score: number;
      let blocked: boolean;
      let blockReason: RecommendationResult["blockReason"] = null;

      if (strictMode) {
        if (!categoryMatch) {
          // ── GATE 1: Hard category block ──────────────────────────────────
          blocked     = true;
          blockReason = "category_mismatch";
          // Score still computed for display purposes in the insight panel
          score = 0.55 * cosineScore + 0.45 * tagScore;
        } else {
          // ── GATE 2: Combined score filter (same category) ─────────────────
          const combined = 0.55 * cosineScore + 0.45 * tagScore;
          score       = combined;
          blocked     = combined < STRICT_THRESHOLD;
          blockReason = blocked ? "low_similarity" : null;
        }
      } else {
        // ── RELAXED: plain cosine, never block ───────────────────────────────
        score       = cosineScore;
        blocked     = false;
        blockReason = null;
      }

      results.push({
        video: candidateVideo,
        score,
        cosineScore,
        tagScore,
        topTerms,
        sharedTags,
        blocked,
        blockReason,
        relation: getRelation(score, strictMode),
        categoryMatch,
      });
    }

    // Sort: allowed first (by score desc), then blocked (by score desc)
    results.sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      return b.score - a.score;
    });

    const blockedCount         = results.filter(r => r.blocked).length;
    const allowedCount         = results.filter(r => !r.blocked).length;
    const categoryBlockedCount = results.filter(r => r.blockReason === "category_mismatch").length;

    // Top query terms for insight panel
    const queryTerms = this.vocabulary
      .map((term, i) => ({ term, score: queryVec[i] }))
      .filter(x => x.score > 0 && !x.term.includes("_"))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(x => x.term);

    const insight: ModelInsight = {
      vocabulary: this.vocabulary.filter(t => !t.includes("_")).slice(0, 60),
      queryTerms,
      queryTags: queryVideo.tags,
      queryCategory: queryVideo.category,
      blockedCount,
      allowedCount,
      categoryBlockedCount,
      threshold: STRICT_THRESHOLD,
      categoryEnforced: strictMode,
    };

    return { results: results.slice(0, maxResults), insight };
  }

  private emptyInsight(strictMode: boolean): ModelInsight {
    return {
      vocabulary: [],
      queryTerms: [],
      queryTags: [],
      queryCategory: "",
      blockedCount: 0,
      allowedCount: 0,
      categoryBlockedCount: 0,
      threshold: STRICT_THRESHOLD,
      categoryEnforced: strictMode,
    };
  }
}

// Singleton engine — built once from all 40 videos
export const recommendationEngine = new FocusTubeRecommendationEngine(VIDEOS);

// Legacy alias for backward compatibility
export const OnTopicRecommendationEngine = FocusTubeRecommendationEngine;
