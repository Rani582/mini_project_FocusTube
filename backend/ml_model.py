"""
ml_model.py  —  FocusTube ML Recommendation Engine  v2.1
═══════════════════════════════════════════════════════════════════════════════
Algorithm: TF-IDF + Cosine Similarity + Tag Jaccard + Category Enforcement

┌─────────────────────────────────────────────────────────────────────────────┐
│  STRICT MODE  (strict_mode=True)  — FILTRATION ONLY                        │
│  Purpose: Keep the user on-topic. No personalisation.                      │
│                                                                             │
│  Gate 1 – Category Enforcement                                              │
│    candidate.category != current.category → BLOCKED (category_mismatch)   │
│                                                                             │
│  Gate 2 – Combined Score (same-category candidates only)                   │
│    combined = 0.55 × cosine_sim + 0.45 × tag_jaccard_sim                  │
│    combined < STRICT_THRESHOLD → BLOCKED (low_similarity)                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  RELAXED MODE  (strict_mode=False)  — NLP HISTORY RECOMMENDATIONS          │
│  Purpose: Personalise based on the user's past search queries.             │
│                                                                             │
│  1. Combine all search-history queries into a weighted profile document.   │
│     Recent queries are repeated up to 3× for higher TF-IDF influence.     │
│  2. Transform the profile through the same TF-IDF vectorizer.             │
│  3. Rank every video by cosine similarity to the profile vector.           │
│  4. No blocking — all videos returned, best-match first.                  │
└─────────────────────────────────────────────────────────────────────────────┘

Document weights (TF-IDF):
  • category   × 6   (dominant signal — same topic area)
  • tags        × 5   (key identifiers, phrase-preserved as bigrams)
  • title       × 2   (topic summary)
  • description × 1   (context, minimal weight)

Dependencies:
  pip install scikit-learn numpy
"""

from __future__ import annotations

import re
from typing import List, Dict, Any, Tuple, Set

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine

from video_data import VIDEOS

# ── Hyper-parameters ───────────────────────────────────────────────────────
TAG_WEIGHT:      int   = 5     # tags repeated N times → primary topic signal
TITLE_WEIGHT:    int   = 2     # title repeated N times
CATEGORY_WEIGHT: int   = 6     # category repeated N times → strongest signal

STRICT_THRESHOLD: float = 0.03  # soft cutoff — almost nothing is blocked
SOFT_THRESHOLD:   float = 0.02  # below this → "unrelated" in relaxed mode

MAX_FEATURES: int = 8_000       # TF-IDF vocabulary cap (bigrams → needs more)

# ── Core stop-words (functional/structural words only) ─────────────────────
STOP_WORDS: Set[str] = {
    # Articles, conjunctions, prepositions
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "into", "through", "over", "after", "before",
    # Auxiliary verbs & copulas
    "is", "are", "was", "were", "be", "been", "have", "has", "do", "does", "will",
    # Pronouns & determiners
    "it", "its", "we", "you", "your", "our", "all", "i", "my", "me",
    "this", "that", "which", "who", "what", "when", "where",
    # Common filler words with no topic signal
    "how", "can", "get", "make", "use", "using", "more", "than",
    "up", "out", "as", "so", "if", "then", "just", "about", "also",
    "very", "new",
    # Pure structural noise (no content value)
    "part", "episode", "series", "video", "watch", "show",
    "every", "first", "second", "full", "complete",
}


def _clean(text: str) -> str:
    """Lowercase and strip non-alphanumeric characters."""
    return re.sub(r"[^a-z0-9\s]", " ", text.lower())


def _build_document(video: Dict[str, Any]) -> str:
    """
    Build a weighted bag-of-words string.
    Tags and category are repeated N times for higher TF-IDF weight.
    """
    parts: List[str] = []

    # ① Category — strongest weight
    cat = _clean(video["category"])
    for _ in range(CATEGORY_WEIGHT):
        parts.append(cat)

    # ② Tags — high weight (the vectorizer's bigram mode preserves multi-word tags)
    for tag in video["tags"]:
        tag_clean = _clean(tag)
        for _ in range(TAG_WEIGHT):
            parts.append(tag_clean)

    # ③ Title — medium weight
    title = _clean(video["title"])
    for _ in range(TITLE_WEIGHT):
        parts.append(title)

    # ④ Description — base weight
    parts.append(_clean(video["description"]))

    return " ".join(parts)


# ── Tag Jaccard similarity ─────────────────────────────────────────────────
def _compute_tag_jaccard(
    tags_a: List[str],
    tags_b: List[str],
) -> Tuple[float, List[str]]:
    """
    Compute tag-based Jaccard similarity plus partial word-overlap bonus.

    Returns
    -------
    jaccard : float  — similarity in [0, 1]
    shared  : list   — human-readable shared tag labels (for explanation UI)
    """
    norm_a = [t.lower().strip() for t in tags_a]
    norm_b_set = {t.lower().strip() for t in tags_b}
    norm_b = list(norm_b_set)

    exact_shared: List[str] = []
    partial_shared: List[str] = []
    used_b: Set[str] = set()

    # Level 1: Exact tag match
    for tag in norm_a:
        if tag in norm_b_set:
            exact_shared.append(tag)
            used_b.add(tag)

    # Level 2: Partial word overlap (words > 3 chars, not stop-words)
    for tag_a in norm_a:
        if tag_a in norm_b_set:
            continue
        words_a = [w for w in tag_a.split() if len(w) > 3 and w not in STOP_WORDS]
        for tag_b in norm_b:
            if tag_b in used_b:
                continue
            words_b = [w for w in tag_b.split() if len(w) > 3 and w not in STOP_WORDS]
            overlap = set(words_a) & set(words_b)
            if overlap:
                partial_shared.append(f"{tag_a} ≈ {tag_b}")
                used_b.add(tag_b)
                break

    all_shared = exact_shared + partial_shared
    union = set(norm_a) | norm_b_set

    # Partial matches weighted at 0.5
    numerator = len(exact_shared) + len(partial_shared) * 0.5
    jaccard = numerator / len(union) if union else 0.0
    return min(jaccard, 1.0), all_shared


def _relation_label(score: float, strict_mode: bool) -> str:
    if strict_mode:
        if score >= 0.50: return "strong"
        if score >= 0.30: return "moderate"
        if score >= STRICT_THRESHOLD: return "weak"
        return "unrelated"
    else:
        if score >= 0.45: return "strong"
        if score >= 0.20: return "moderate"
        if score >= SOFT_THRESHOLD: return "weak"
        return "unrelated"


# ── ML Engine ─────────────────────────────────────────────────────────────
class FocusTubeRecommendationEngine:
    """
    Content-based recommendation engine — TF-IDF cosine + Tag Jaccard.

    Usage::
        engine = FocusTubeRecommendationEngine(VIDEOS)
        results, insight = engine.recommend("ml-001", strict_mode=True)
    """

    def __init__(self, videos: List[Dict[str, Any]]) -> None:
        self.videos = videos
        self._id_to_index: Dict[str, int] = {v["id"]: i for i, v in enumerate(videos)}

        documents = [_build_document(v) for v in videos]

        # Fit TF-IDF — bigrams capture "machine learning", "neural network", etc.
        self.vectorizer = TfidfVectorizer(
            max_features=MAX_FEATURES,
            stop_words=list(STOP_WORDS),
            ngram_range=(1, 2),   # unigrams + bigrams → phrase awareness
            sublinear_tf=True,    # log(1 + tf) dampening avoids repetition dominance
            min_df=1,
            dtype=np.float32,
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(documents)
        self.feature_names: List[str] = self.vectorizer.get_feature_names_out().tolist()

    # ── Public API ─────────────────────────────────────────────────────────
    def recommend(
        self,
        video_id: str,
        strict_mode: bool = True,
        max_results: int = 20,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Return recommendations for video_id.

        STRICT MODE gates:
          1. Category must match → else blocked (blockReason: "category_mismatch")
          2. combined = 0.55×cosine + 0.45×tagJaccard ≥ threshold → else blocked
             (blockReason: "low_similarity")

        RELAXED MODE:
          • Pure cosine similarity, sorted descending, no blocking.
        """
        idx = self._id_to_index.get(video_id)
        if idx is None:
            return [], self._empty_insight(strict_mode)

        query_video  = self.videos[idx]
        query_vec    = self.tfidf_matrix[idx]
        query_cat    = query_video["category"]

        # Cosine similarities against all videos at once (vectorised — fast)
        sim_scores = sklearn_cosine(query_vec, self.tfidf_matrix).flatten()

        results: List[Dict[str, Any]] = []

        for i, video in enumerate(self.videos):
            if i == idx:
                continue

            cosine_score = float(sim_scores[i])
            tag_jaccard, shared_tags = _compute_tag_jaccard(
                query_video["tags"], video["tags"]
            )

            category_match = video["category"] == query_cat
            top_terms = self._top_shared_terms(query_vec, self.tfidf_matrix[i], n=6)

            if strict_mode:
                combined = 0.55 * cosine_score + 0.45 * tag_jaccard
                if not category_match:
                    # Soft penalty for off-category — still shown, ranked lower
                    score = combined * 0.30
                else:
                    score = combined
                # Never hard-block — always return results like YouTube
                blocked = False
                block_reason = None
            else:
                score = cosine_score
                blocked = False
                block_reason = None

            results.append({
                "video":         video,
                "score":         round(score, 4),
                "cosineScore":   round(cosine_score, 4),
                "tagScore":      round(tag_jaccard, 4),
                "topTerms":      top_terms,
                "sharedTags":    shared_tags,
                "blocked":       blocked,
                "blockReason":   block_reason,
                "relation":      _relation_label(score, strict_mode),
                "categoryMatch": category_match,
            })

        # Sort by score descending — same-category naturally ranks first
        results.sort(key=lambda x: -x["score"])

        blocked_count          = sum(1 for r in results if r["blocked"])
        allowed_count          = len(results) - blocked_count
        category_blocked_count = sum(
            1 for r in results if r["blockReason"] == "category_mismatch"
        )

        query_terms = self._top_terms_for_vector(query_vec, n=15)

        insight: Dict[str, Any] = {
            "vocabulary":           self.feature_names[:60],
            "queryTerms":           query_terms,
            "queryTags":            query_video["tags"],
            "queryCategory":        query_cat,
            "blockedCount":         blocked_count,
            "allowedCount":         allowed_count,
            "categoryBlockedCount": category_blocked_count,
            "threshold":            STRICT_THRESHOLD,
            "categoryEnforced":     strict_mode,
        }

        return results[:max_results], insight

    def recommend_from_history(
        self,
        search_history: List[str],
        max_results: int = 20,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        RELAXED MODE — NLP recommendations driven by the user's search history.

        Builds a weighted TF-IDF profile from all past search queries
        (recent queries repeated more) then ranks every video by cosine
        similarity to that profile. Nothing is blocked.
        """
        if not search_history:
            return [], self._empty_insight(False)

        # Weight recent queries more: oldest=1×, newest=3×
        n = len(search_history)
        weighted_parts: List[str] = []
        for i, query in enumerate(search_history):
            weight = 1 + int(2 * (i + 1) / n)   # ramps 1 → 3
            for _ in range(weight):
                weighted_parts.append(_clean(query))

        history_doc = " ".join(weighted_parts)
        history_vec = self.vectorizer.transform([history_doc])

        sim_scores = sklearn_cosine(history_vec, self.tfidf_matrix).flatten()

        results: List[Dict[str, Any]] = []
        for i, video in enumerate(self.videos):
            cosine_score = float(sim_scores[i])
            results.append({
                "video":         video,
                "score":         round(cosine_score, 4),
                "cosineScore":   round(cosine_score, 4),
                "tagScore":      0.0,
                "topTerms":      self._top_shared_terms(history_vec, self.tfidf_matrix[i], n=6),
                "sharedTags":    [],
                "blocked":       False,
                "blockReason":   None,
                "relation":      _relation_label(cosine_score, False),
                "categoryMatch": True,
            })

        results.sort(key=lambda x: -x["score"])

        insight: Dict[str, Any] = {
            "vocabulary":           self.feature_names[:60],
            "queryTerms":           self._top_terms_for_vector(history_vec, n=15),
            "queryTags":            [],
            "queryCategory":        "Personalized (History-Based NLP)",
            "blockedCount":         0,
            "allowedCount":         len(results),
            "categoryBlockedCount": 0,
            "threshold":            SOFT_THRESHOLD,
            "categoryEnforced":     False,
        }

        return results[:max_results], insight

    def search(self, query: str) -> List[Dict[str, Any]]:
        """Keyword search ranked by relevance score."""
        q = query.lower()
        matched = []
        for v in self.videos:
            score = 0
            if q in v["title"].lower():    score += 3
            if q in v["category"].lower(): score += 2
            if any(q in t.lower() for t in v["tags"]): score += 2
            if q in v["channel"].lower():  score += 1
            if q in v["description"].lower(): score += 1
            if score > 0:
                matched.append((score, v))
        matched.sort(key=lambda x: x[0], reverse=True)
        return [v for _, v in matched]

    # ── Private helpers ────────────────────────────────────────────────────
    def _top_terms_for_vector(self, vec, n: int = 15) -> List[str]:
        arr = vec.toarray().flatten()
        top_idx = arr.argsort()[::-1][:n]
        return [self.feature_names[i] for i in top_idx if arr[i] > 0]

    def _top_shared_terms(self, vec_a, vec_b, n: int = 6) -> List[str]:
        a = vec_a.toarray().flatten()
        b = vec_b.toarray().flatten()
        product = a * b
        top_idx = product.argsort()[::-1][:n]
        return [self.feature_names[i] for i in top_idx if product[i] > 0]

    def _empty_insight(self, strict_mode: bool) -> Dict[str, Any]:
        return {
            "vocabulary":           [],
            "queryTerms":           [],
            "queryTags":            [],
            "queryCategory":        "",
            "blockedCount":         0,
            "allowedCount":         0,
            "categoryBlockedCount": 0,
            "threshold":            STRICT_THRESHOLD,
            "categoryEnforced":     strict_mode,
        }


# Singleton — instantiated once at import time
engine = FocusTubeRecommendationEngine(VIDEOS)
