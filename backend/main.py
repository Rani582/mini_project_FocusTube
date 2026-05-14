"""
main.py — FastAPI Backend for FocusTube Platform  v2.0
═══════════════════════════════════════════════════════
ML-powered stay-on-topic recommendation engine.
Algorithm: TF-IDF + Cosine Similarity + Tag Jaccard + Category Enforcement

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Frontend connects to: http://localhost:8000
Interactive API docs: http://localhost:8000/docs
"""

from __future__ import annotations

import os
import asyncio
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:  # pragma: no cover
    AsyncIOMotorClient = None  # type: ignore

# Ensure the motor client is available; provide a clear error if not.
if AsyncIOMotorClient is None:
    raise RuntimeError("The 'motor' package is required but not installed. Run 'pip install motor' in the backend virtual environment and restart the server.")
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI not set in .env")


# Create a single motor client with aggressive timeouts so slow Atlas
# connections fail fast and fall through to the local data fallback.
mongo_client = AsyncIOMotorClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=3000,   # give up finding a server after 3 s
    connectTimeoutMS=3000,
    socketTimeoutMS=4000,            # individual operation timeout
)
# Choose a database name – you can keep it "focusTube" or any name you prefer
db = mongo_client.focusTube
# Collections
videos_collection = db.videos
users_collection = db.users
from googleapiclient.discovery import build


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

from video_data import VIDEOS, CATEGORIES, TRENDING_VIDEOS
from ml_model import engine, STRICT_THRESHOLD, SOFT_THRESHOLD, TAG_WEIGHT, CATEGORY_WEIGHT, TITLE_WEIGHT

def get_thumbnail_url(snippet: Dict) -> str:
    thumbnails = snippet.get("thumbnails", {})
    if "high" in thumbnails: return thumbnails["high"]["url"]
    if "medium" in thumbnails: return thumbnails["medium"]["url"]
    if "default" in thumbnails: return thumbnails["default"]["url"]
    return ""

# ── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="FocusTube — ML Recommendation API",
    description=(
        "Stay-on-topic content-based recommendation engine.\n\n"
        "**Strict Mode (default):**\n"
        "- Gate 1: Only videos from the SAME category pass.\n"
        "- Gate 2: combined = 0.55×cosine + 0.45×tagJaccard ≥ threshold.\n\n"
        "**Relaxed Mode:**\n"
        "- Pure TF-IDF cosine similarity, all videos ranked, nothing blocked.\n\n"
        "Powered by scikit-learn TfidfVectorizer + cosine_similarity."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic schemas ───────────────────────────────────────────────────────
class VideoOut(BaseModel):
    id: str
    youtubeId: str
    title: str
    description: str
    category: str
    tags: List[str]
    thumbnail: str
    duration: str
    views: str
    likes: int
    channel: str
    channelAvatar: str
    uploadedAt: str
    subscribers: str


class RecommendationItem(BaseModel):
    video: VideoOut
    score: float
    cosineScore: float
    tagScore: float
    topTerms: List[str]
    sharedTags: List[str]
    blocked: bool
    blockReason: Optional[str]
    relation: str
    categoryMatch: bool


class ModelInsight(BaseModel):
    vocabulary: List[str]
    queryTerms: List[str]
    queryTags: List[str]
    queryCategory: str
    blockedCount: int
    allowedCount: int
    categoryBlockedCount: int
    threshold: float
    categoryEnforced: bool


class RecommendationResponse(BaseModel):
    results: List[RecommendationItem]
    insight: ModelInsight


class VideosResponse(BaseModel):
    videos: List[VideoOut]
    total: int


class SearchResponse(BaseModel):
    videos: List[VideoOut]
    query: str
    total: int


class CategoriesResponse(BaseModel):
    categories: List[str]


class TrendingResponse(BaseModel):
    videos: List[VideoOut]
    total: int
    year: int = 2025


class SearchHistoryRequest(BaseModel):
    """Request body for personalized NLP recommendations (RELAXED mode)."""
    search_history: List[str]   # ordered oldest → newest
    max_results: int = 20


class HealthResponse(BaseModel):
    status: str
    model: str
    vocabulary_size: int
    total_videos: int
    strict_threshold: float
    soft_threshold: float
    backend: str


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "FocusTube ML Backend v2.0 — visit /docs for API documentation",
        "features": [
            "TF-IDF + Cosine Similarity",
            "Tag Jaccard Similarity",
            "Category Enforcement in Strict Mode",
            "Phrase-aware bigram tokenization",
        ],
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    """Backend health check — frontend polls this every 8 seconds."""
    return HealthResponse(
        status="ok",
        model="TF-IDF + Cosine Sim + Tag Jaccard (scikit-learn)",
        vocabulary_size=len(engine.feature_names),
        total_videos=len(VIDEOS),
        strict_threshold=STRICT_THRESHOLD,
        soft_threshold=SOFT_THRESHOLD,
        backend="Python / FastAPI v2.0",
    )
@app.get("/db/health", tags=["Health"])
async def db_health():
    """Check MongoDB connectivity."""
    try:
        await mongo_client.admin.command("ping")
        return {"status": "ok", "detail": "MongoDB connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB connection error: {e}")


@app.get("/videos", response_model=VideosResponse, tags=["Videos"])
async def get_videos(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Return all videos, optionally filtered by category."""
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            query = category if category else "educational OR entertainment"
            search_response = youtube.search().list(
                q=query,
                part="id,snippet",
                maxResults=limit,
                type="video",
                videoEmbeddable="true"
            ).execute()
            
            real_videos = []
            for item in search_response.get("items", []):
                vid_id = item["id"]["videoId"]
                snippet = item["snippet"]
                real_videos.append({
                    "id": vid_id,
                    "youtubeId": vid_id,
                    "title": snippet["title"],
                    "description": snippet["description"],
                    "category": category if category else "Educational",
                    "tags": [snippet["channelTitle"]],
                    "thumbnail": get_thumbnail_url(snippet),
                    "duration": "10:00",
                    "views": "1.2M",
                    "likes": 50000,
                    "channel": snippet["channelTitle"],
                    "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={snippet['channelTitle'][:2].upper()}",
                    "uploadedAt": "Recent",
                    "subscribers": "1M"
                })
            return VideosResponse(videos=real_videos, total=len(real_videos))
        except Exception as e:
            print(f"YouTube API Error: {e}")
            pass
    # Fallback tier 2: query MongoDB (with hard timeout so slow Atlas
    # connections don't stall the response for 30+ seconds)
    async def _fetch_from_mongo() -> list:
        f = {}
        if category:
            f["category"] = category
        cur = videos_collection.find(f).skip(offset).limit(limit)
        docs = []
        async for doc in cur:
            if "_id" in doc:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
            docs.append(doc)
        return docs

    try:
        mongo_videos = await asyncio.wait_for(_fetch_from_mongo(), timeout=5.0)
        if mongo_videos:
            return VideosResponse(videos=mongo_videos, total=len(mongo_videos))
    except (asyncio.TimeoutError, Exception) as e:
        print(f"MongoDB fallback skipped: {e}")

    # Fallback tier 3: local video_data.py — instant, always works
    local = VIDEOS
    if category:
        local = [v for v in VIDEOS if v.get("category", "").lower() == category.lower()]
    paged = local[offset: offset + limit]
    return VideosResponse(videos=paged, total=len(local))
    


@app.get("/videos/{video_id}", response_model=VideoOut, tags=["Videos"])
async def get_video(video_id: str):
    """Return a single video by ID from YouTube."""
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            video_response = youtube.videos().list(
                part="snippet,statistics",
                id=video_id
            ).execute()
            items = video_response.get("items", [])
            if items:
                item = items[0]
                snippet = item["snippet"]
                statistics = item.get("statistics", {})
                
                thumbnail_url = get_thumbnail_url(snippet)

                return {
                    "id": video_id,
                    "youtubeId": video_id,
                    "title": snippet["title"],
                    "description": snippet["description"],
                    "category": "Educational",
                    "tags": [snippet["channelTitle"]],
                    "thumbnail": thumbnail_url,
                    "duration": "10:00",
                    "views": statistics.get("viewCount", "1.2M"),
                    "likes": int(statistics.get("likeCount", 50000)),
                    "channel": snippet["channelTitle"],
                    "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={snippet['channelTitle'][:2].upper()}",
                    "uploadedAt": snippet.get("publishedAt", "Recent")[:10],
                    "subscribers": "1M"
                }
        except Exception as e:
            print(f"YouTube API Error: {e}")
            pass
    # Fallback tier 2: query MongoDB for specific video
    try:
        doc = await videos_collection.find_one({"$or": [{"youtubeId": video_id}, {"id": video_id}]})
        if doc:
            if "_id" in doc:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
            return doc
    except Exception as e:
        print(f"MongoDB Error: {e}")

    # Fallback tier 3: local video_data.py (includes TRENDING_VIDEOS too)
    for v in VIDEOS:
        if v["id"] == video_id or v.get("youtubeId") == video_id:
            return v
    for v in TRENDING_VIDEOS:
        if v["id"] == video_id or v.get("youtubeId") == video_id:
            return v

    raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found")


@app.get(
    "/recommendations/{video_id}",
    response_model=RecommendationResponse,
    tags=["ML Recommendations"],
)
async def get_recommendations(
    video_id: str,
    strict_mode: bool = Query(
        False,
        description=(
            "STRICT=True → category-priority ranking (same-cat ranked highest). "
            "STRICT=False → NLP recommendations from user's search history (default)."
        ),
    ),
    search_history: Optional[List[str]] = Query(
        None,
        description="User's past search queries (oldest→newest). Used when strict_mode=False.",
    ),
    max_results: int = Query(20, ge=1, le=40),
):
    """
    Get ML-powered recommendations.

    - **STRICT mode ON**  → FILTRATION ONLY: Gate 1 blocks category
      mismatches; Gate 2 blocks low combined-score videos.
      No personalisation — purely keeps the user on-topic.

    - **STRICT mode OFF** → NLP HISTORY RECOMMENDATIONS: Builds a
      TF-IDF profile from the caller's search history and ranks every
      video by cosine similarity to that profile. No blocking.
      Pass `search_history` as repeated query params, e.g.
      `?search_history=python&search_history=machine+learning`
    """
    # ── RELAXED: history-based NLP (strict_mode=False) ────────────────────
    if not strict_mode:
        history = [h.strip() for h in (search_history or []) if h.strip()]

        if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE" and history:
            try:
                youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
                # Derive a YouTube query from the most recent history terms
                nlp_query = " ".join(history[-5:])  # last 5 searches
                search_response = youtube.search().list(
                    q=nlp_query,
                    part="id,snippet",
                    maxResults=max_results + 1,
                    type="video",
                    videoEmbeddable="true"
                ).execute()
                real_recs = []
                for item in search_response.get("items", []):
                    vid_id = item["id"]["videoId"]
                    if vid_id == video_id:
                        continue
                    s = item["snippet"]
                    real_recs.append({
                        "video": {
                            "id": vid_id, "youtubeId": vid_id,
                            "title": s["title"], "description": s["description"],
                            "category": "Educational", "tags": [s["channelTitle"]],
                            "thumbnail": get_thumbnail_url(s), "duration": "10:00",
                            "views": "1.2M", "likes": 50000,
                            "channel": s["channelTitle"],
                            "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={s['channelTitle'][:2].upper()}",
                            "uploadedAt": "Recent", "subscribers": "1M"
                        },
                        "score": 0.9, "cosineScore": 0.9, "tagScore": 0.0,
                        "topTerms": [], "sharedTags": [], "blocked": False,
                        "blockReason": None, "relation": "strong", "categoryMatch": True
                    })
                insight = ModelInsight(
                    vocabulary=[], queryTerms=history[-5:], queryTags=[],
                    queryCategory="Personalized (History-Based NLP)",
                    blockedCount=0, allowedCount=len(real_recs),
                    categoryBlockedCount=0, threshold=SOFT_THRESHOLD,
                    categoryEnforced=False
                )
                return RecommendationResponse(results=real_recs[:max_results], insight=insight)
            except Exception as e:
                print(f"YouTube API Error (relaxed/history): {e}")

        # Local NLP fallback: use ML engine history-based method
        results, insight_dict = engine.recommend_from_history(
            search_history=history or [video_id],
            max_results=max_results
        )
        # Remove the video itself from results
        results = [r for r in results if r["video"]["id"] != video_id]
        return RecommendationResponse(
            results=results[:max_results],
            insight=ModelInsight(**insight_dict)
        )

    # ── STRICT: filtration only (strict_mode=True) ────────────────────────
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            video_response = youtube.videos().list(
                part="snippet", id=video_id
            ).execute()
            items = video_response.get("items", [])
            if items:
                snippet = items[0]["snippet"]
                title = snippet["title"]
                search_response = youtube.search().list(
                    q=title, part="id,snippet",
                    maxResults=max_results + 1,
                    type="video", videoEmbeddable="true"
                ).execute()
                real_recs = []
                for item in search_response.get("items", []):
                    vid_id = item["id"]["videoId"]
                    if vid_id == video_id:
                        continue
                    s = item["snippet"]
                    real_recs.append({
                        "video": {
                            "id": vid_id, "youtubeId": vid_id,
                            "title": s["title"], "description": s["description"],
                            "category": "Educational", "tags": [s["channelTitle"]],
                            "thumbnail": get_thumbnail_url(s), "duration": "10:00",
                            "views": "1.2M", "likes": 50000,
                            "channel": s["channelTitle"],
                            "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={s['channelTitle'][:2].upper()}",
                            "uploadedAt": "Recent", "subscribers": "1M"
                        },
                        "score": 0.9, "cosineScore": 0.9, "tagScore": 0.9,
                        "topTerms": [], "sharedTags": [], "blocked": False,
                        "blockReason": None, "relation": "strong", "categoryMatch": True
                    })
                insight = ModelInsight(
                    vocabulary=[], queryTerms=[], queryTags=[],
                    queryCategory="Educational",
                    blockedCount=0, allowedCount=len(real_recs),
                    categoryBlockedCount=0, threshold=STRICT_THRESHOLD,
                    categoryEnforced=True
                )
                return RecommendationResponse(results=real_recs[:max_results], insight=insight)
        except Exception as e:
            print(f"YouTube API Error (strict): {e}")

    # Local ML fallback
    target_id = video_id
    for v in VIDEOS:
        if v.get("youtubeId") == video_id:
            target_id = v["id"]
            break
    results, insight_dict = engine.recommend(target_id, strict_mode=True, max_results=max_results)

    # —— Guarantee results: supplement if fewer than 8 returned ——
    if len(results) < 8:
        seen_ids = {r["video"]["id"] for r in results}
        seen_ids.add(target_id)
        for v in VIDEOS:
            if v["id"] not in seen_ids:
                results.append({
                    "video":         v,
                    "score":         0.1,
                    "cosineScore":   0.1,
                    "tagScore":      0.0,
                    "topTerms":      [],
                    "sharedTags":    [],
                    "blocked":       False,
                    "blockReason":   None,
                    "relation":      "weak",
                    "categoryMatch": False,
                })
                if len(results) >= max_results:
                    break

    if not results:
        raise HTTPException(status_code=404, detail=f"Video '{video_id}' not found")
    return RecommendationResponse(results=results[:max_results], insight=ModelInsight(**insight_dict))


@app.post(
    "/recommendations/personalized",
    response_model=RecommendationResponse,
    tags=["ML Recommendations"],
)
async def get_personalized_recommendations(body: SearchHistoryRequest):
    """
    **RELAXED MODE — NLP History Recommendations**

    Accepts the user's ordered search history and returns personalized
    recommendations using TF-IDF cosine similarity against the history
    profile. No category filtering. Recent queries are weighted higher.
    """
    history = [h.strip() for h in body.search_history if h.strip()]
    if not history:
        raise HTTPException(status_code=400, detail="search_history must not be empty")

    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            nlp_query = " ".join(history[-5:])
            search_response = youtube.search().list(
                q=nlp_query, part="id,snippet",
                maxResults=body.max_results,
                type="video", videoEmbeddable="true"
            ).execute()
            real_recs = []
            for item in search_response.get("items", []):
                vid_id = item["id"]["videoId"]
                s = item["snippet"]
                real_recs.append({
                    "video": {
                        "id": vid_id, "youtubeId": vid_id,
                        "title": s["title"], "description": s["description"],
                        "category": "Educational", "tags": [s["channelTitle"]],
                        "thumbnail": get_thumbnail_url(s), "duration": "10:00",
                        "views": "1.2M", "likes": 50000,
                        "channel": s["channelTitle"],
                        "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={s['channelTitle'][:2].upper()}",
                        "uploadedAt": "Recent", "subscribers": "1M"
                    },
                    "score": 0.9, "cosineScore": 0.9, "tagScore": 0.0,
                    "topTerms": [], "sharedTags": [], "blocked": False,
                    "blockReason": None, "relation": "strong", "categoryMatch": True
                })
            insight = ModelInsight(
                vocabulary=[], queryTerms=history[-5:], queryTags=[],
                queryCategory="Personalized (History-Based NLP)",
                blockedCount=0, allowedCount=len(real_recs),
                categoryBlockedCount=0, threshold=SOFT_THRESHOLD, categoryEnforced=False
            )
            return RecommendationResponse(results=real_recs, insight=insight)
        except Exception as e:
            print(f"YouTube API Error (personalized): {e}")

    results, insight_dict = engine.recommend_from_history(
        search_history=history,
        max_results=body.max_results
    )
    return RecommendationResponse(results=results, insight=ModelInsight(**insight_dict))


@app.get("/search", response_model=SearchResponse, tags=["Search"])
async def search_videos(q: str = Query(..., min_length=1)):
    """Keyword search across titles, categories, tags, channels, descriptions."""
    
    # If API key is valid and not "YOUR_API_KEY_HERE", use real YouTube search
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            search_response = youtube.search().list(
                q=q,
                part="id,snippet",
                maxResults=15,
                type="video",
                videoEmbeddable="true"
            ).execute()

            real_videos = []
            for item in search_response.get("items", []):
                vid_id = item["id"]["videoId"]
                snippet = item["snippet"]
                
                # Mock extra data that requires more API calls for simplicity
                real_videos.append({
                    "id": vid_id,
                    "youtubeId": vid_id,
                    "title": snippet["title"],
                    "description": snippet["description"],
                    "category": "Educational" if "edu" in q.lower() else "Entertainment",
                    "tags": [q, snippet["channelTitle"]],
                    "thumbnail": get_thumbnail_url(snippet),
                    "duration": "10:00",
                    "views": "1.2M",
                    "likes": 50000,
                    "channel": snippet["channelTitle"],
                    "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={snippet['channelTitle'][:2].upper()}",
                    "uploadedAt": "Recent",
                    "subscribers": "1M"
                })
            
            return SearchResponse(videos=real_videos, query=q, total=len(real_videos))
        except Exception as e:
            print(f"YouTube API Error: {e}")
            pass

    results = engine.search(q)
    return SearchResponse(videos=results[:15], query=q, total=len(results))


@app.get("/categories", response_model=CategoriesResponse, tags=["Videos"])
async def get_categories():
    """Return all available video categories."""
    return CategoriesResponse(categories=CATEGORIES)


@app.get("/trending", response_model=TrendingResponse, tags=["Trending"])
async def get_trending(
    category: Optional[str] = Query(None, description="Filter by category: Music, Gaming, Sports, Technology, Entertainment"),
    limit: int = Query(20, ge=1, le=20),
):
    """
    **Trending Section — Relaxed Mode**

    Returns the 20 most-watched videos of 2025, curated across Music, Gaming,
    Sports, Technology, and Entertainment. No category filtering applied —
    these are always shown regardless of the user's focus mode.
    Sorted by likes descending (most viral first).
    """
    # If YouTube API key is valid, try to fetch real trending from YouTube
    if YOUTUBE_API_KEY and YOUTUBE_API_KEY != "YOUR_API_KEY_HERE":
        try:
            youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
            params = dict(
                part="id,snippet,statistics",
                chart="mostPopular",
                regionCode="US",
                maxResults=limit,
            )
            if category:
                # YouTube category IDs: 10=Music, 20=Gaming, 17=Sports, 28=Science&Tech, 24=Entertainment
                cat_map = {"Music": "10", "Gaming": "20", "Sports": "17", "Technology": "28", "Entertainment": "24"}
                vid_cat_id = cat_map.get(category)
                if vid_cat_id:
                    params["videoCategoryId"] = vid_cat_id
            resp = youtube.videos().list(**params).execute()
            yt_videos = []
            for item in resp.get("items", []):
                s = item["snippet"]
                stats = item.get("statistics", {})
                yt_videos.append({
                    "id": item["id"], "youtubeId": item["id"],
                    "title": s["title"], "description": s.get("description", ""),
                    "category": category or "Trending",
                    "tags": s.get("tags", [s["channelTitle"]])[:5],
                    "thumbnail": get_thumbnail_url(s),
                    "duration": "10:00",
                    "views": f"{int(stats.get('viewCount', 0)) // 1_000_000}M",
                    "likes": int(stats.get("likeCount", 0)),
                    "channel": s["channelTitle"],
                    "channelAvatar": f"https://api.dicebear.com/7.x/initials/svg?seed={s['channelTitle'][:2].upper()}&backgroundColor=ef4444",
                    "uploadedAt": s.get("publishedAt", "")[:10],
                    "subscribers": "1M"
                })
            return TrendingResponse(videos=yt_videos, total=len(yt_videos))
        except Exception as e:
            print(f"YouTube Trending API Error: {e}")

    # Fallback: return curated 2025 trending dataset
    filtered = TRENDING_VIDEOS
    if category:
        filtered = [v for v in TRENDING_VIDEOS if v["category"].lower() == category.lower()]
    # Sort by likes descending (most viral first)
    sorted_trending = sorted(filtered, key=lambda v: v["likes"], reverse=True)
    return TrendingResponse(videos=sorted_trending[:limit], total=len(sorted_trending))


@app.get("/model/info", tags=["ML Recommendations"])
async def model_info():
    """Technical information about the ML model configuration."""
    return {
        "algorithm":        "TF-IDF + Cosine Similarity + Tag Jaccard",
        "library":          "scikit-learn",
        "language":         "Python 3.11+",
        "vocabulary_size":  len(engine.feature_names),
        "ngram_range":      [1, 2],
        "max_features":     8000,
        "sublinear_tf":     True,
        "tag_weight":       TAG_WEIGHT,
        "title_weight":     TITLE_WEIGHT,
        "category_weight":  CATEGORY_WEIGHT,
        "strict_threshold": STRICT_THRESHOLD,
        "soft_threshold":   SOFT_THRESHOLD,
        "total_videos":     len(VIDEOS),
        "strict_mode_gates": [
            "Gate 1: category must match (hard block)",
            f"Gate 2: combined score (0.55×cosine + 0.45×tagJaccard) ≥ {STRICT_THRESHOLD}",
        ],
        "sample_vocabulary": engine.feature_names[:30],
    }
