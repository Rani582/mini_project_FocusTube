import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ThumbsUp, ThumbsDown, Share2, Download, MoreHorizontal,
  Bell, ChevronDown, ChevronUp, ShieldCheck, ShieldOff,
  CheckCircle2, XCircle, TrendingUp, Loader2, Play, Layers, Tag,
} from "lucide-react";
import { VIDEOS } from "../../lib/videoData";
import { RecommendationResult } from "../../lib/mlRecommendationModel";
import { fetchVideo, fetchRecommendations } from "../../lib/apiService";
import { MLInsightPanel } from "../components/MLInsightPanel";
import { BackendStatusBadge } from "../components/BackendStatus";
import { FocusSessionBanner } from "../components/FocusHUD";
import { useFocusSession } from "../../lib/focusSession";
import type { ModelInsight } from "../../lib/mlRecommendationModel";

// ── Score badge ───────────────────────────────────────────────────────────
function ScoreBadge({ score, blocked, blockReason }: { score: number; blocked: boolean; blockReason?: string | null }) {
  const pct = Math.round(score * 100);
  if (blockReason === "category_mismatch") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-red-950/40 text-red-400 border-red-500/30 font-medium">
        <Layers className="w-2.5 h-2.5" /> Wrong category
      </span>
    );
  }
  let bg = "bg-green-500/20 text-green-300 border-green-500/30";
  let label = "Strong";
  if (score < 0.15) { bg = "bg-red-500/20 text-red-300 border-red-500/30"; label = "Low sim"; }
  else if (score < 0.25) { bg = "bg-orange-500/20 text-orange-300 border-orange-500/30"; label = "Weak"; }
  else if (score < 0.40) { bg = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"; label = "Moderate"; }
  if (blocked) { bg = "bg-red-900/30 text-red-400 border-red-500/30"; label = "Blocked"; }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${bg}`}>
      {blocked ? <XCircle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
      {label} {pct}%
    </span>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────
function RecommendationCard({ result }: { result: RecommendationResult }) {
  const navigate = useNavigate();
  const { video, score, sharedTags, blocked, blockReason, tagScore } = result;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`transition-opacity ${blocked ? "opacity-30 pointer-events-none" : ""}`}
    >
      <motion.button
        disabled={blocked}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate(`/watch/${video.id}`)}
        className="flex gap-2.5 w-full text-left rounded-2xl p-2 hover:bg-white/6 transition-colors"
      >
        {/* Thumbnail */}
        <div className="relative shrink-0 w-40 aspect-video rounded-xl overflow-hidden bg-white/8">
          <motion.img
            src={video.thumbnail}
            alt={video.title}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
            {video.duration}
          </div>
          {blocked && (
            <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center backdrop-blur-sm gap-1">
              <ShieldOff className="w-5 h-5 text-red-300" />
              <span className="text-red-300 text-[9px] font-medium">
                {blockReason === "category_mismatch" ? "Wrong category" : "Off-topic"}
              </span>
            </div>
          )}
          {!blocked && (
            <motion.div
              animate={{ opacity: hovered ? 1 : 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm line-clamp-2 leading-snug mb-1 ${blocked ? "text-white/25 line-through" : "text-white"}`}>
            {video.title}
          </p>
          <p className="text-white/40 text-xs truncate">{video.channel}</p>
          <p className="text-white/30 text-xs">{video.views} · {video.uploadedAt}</p>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <ScoreBadge score={score} blocked={blocked} blockReason={blockReason} />
            {!blocked && tagScore !== undefined && tagScore > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300/80 border border-yellow-500/20">
                <Tag className="w-2 h-2" />
                {Math.round(tagScore * 100)}% tags
              </span>
            )}
          </div>
          {/* Shared tags */}
          {!blocked && sharedTags && sharedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {sharedTags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/35 text-purple-300/75 border border-purple-500/15 truncate max-w-[80px]">
                  {t}
                </span>
              ))}
            </div>
          )}
          {blocked && blockReason === "category_mismatch" && (
            <p className="text-red-400/50 text-[10px] mt-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Different category
            </p>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}

// ── Real Video Player ───────────────────────────────────────────────────────
function RealVideoPlayer({ videoId, isShort }: { videoId: string; isShort?: boolean }) {
  return (
    <div className={`relative w-full ${isShort ? "aspect-[9/16] max-w-[400px] mx-auto" : "aspect-video"} bg-black rounded-2xl overflow-hidden shadow-2xl group`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
      
      {/* Premium Overlay for Focus Mode indication */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] text-white/80 font-semibold tracking-wider uppercase">Focus Mode Active</span>
        </div>
      </div>
    </div>
  );
}


// ── Main VideoPlayer page ─────────────────────────────────────────────────
export function VideoPlayer() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { session, recordVideoWatch, toggleStrictMode } = useFocusSession();
  const strictMode = session.strictMode;
  const [descExpanded, setDescExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const [video, setVideo] = useState(VIDEOS.find((v) => v.id === videoId) ?? null);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [insight, setInsight] = useState<ModelInsight>({
    vocabulary: [], queryTerms: [], queryTags: [], queryCategory: "",
    blockedCount: 0, allowedCount: 0, categoryBlockedCount: 0,
    threshold: 0.15, categoryEnforced: true,
  });
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recFromBackend, setRecFromBackend] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!videoId) return;
    setVideo(VIDEOS.find((v) => v.id === videoId) ?? null);
    fetchVideo(videoId).then(({ video: v }) => { if (v) setVideo(v); });
  }, [videoId]);

  // Record video watch in focus session whenever we land on a new video
  useEffect(() => {
    if (!video || !session.isActive) return;
    const onTopic = video.category === session.topic;
    recordVideoWatch(onTopic);
  }, [video?.id, session.isActive]);

  useEffect(() => {
    if (!videoId) return;
    setLoadingRecs(true);
    fetchRecommendations(videoId, strictMode).then(({ results: r, insight: ins, fromBackend }) => {
      setResults(r);
      setInsight(ins);
      setRecFromBackend(fromBackend);
      setLoadingRecs(false);
    });
  }, [videoId, strictMode]);

  if (!video) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-white text-lg mb-4">Loading…</p>
          <button onClick={() => navigate("/")} className="px-5 py-2 bg-white text-black rounded-full text-sm" style={{ fontWeight: 600 }}>
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  const allowed = results.filter((r) => !r.blocked);
  const blocked = results.filter((r) => r.blocked);
  const visible = showBlocked ? results : allowed;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-[1700px] mx-auto px-4 py-5 flex gap-6 flex-col xl:flex-row">

        {/* ── LEFT: Player + info ── */}
        <div className="flex-1 min-w-0">
          {/* Player */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <RealVideoPlayer videoId={video.id} isShort={video.category === "Shorts"} />
          </motion.div>

          {/* Focus session banner — shown directly below the player */}
          <FocusSessionBanner videoCategory={video.category} />

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-white mt-4 mb-3 leading-snug"
            style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.3px" }}
          >
            {video.title}
          </motion.h1>

          {/* Meta + actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="flex flex-wrap items-center justify-between gap-3 mb-4"
          >
            {/* Channel info */}
            <div className="flex items-center gap-3">
              <motion.img
                whileHover={{ scale: 1.08 }}
                src={video.channelAvatar}
                alt={video.channel}
                className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-transparent hover:ring-white/20 transition-all cursor-pointer"
              />
              <div>
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>{video.channel}</p>
                <p className="text-white/40 text-xs">{video.subscribers} subscribers</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSubscribed(!subscribed)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${
                  subscribed
                    ? "bg-white/15 text-white"
                    : "bg-white text-black hover:bg-white/90"
                }`}
                style={{ fontWeight: 600 }}
              >
                {subscribed && <Bell className="w-3.5 h-3.5" />}
                {subscribed ? "Subscribed" : "Subscribe"}
              </motion.button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Like/Dislike */}
              <div className="flex items-center rounded-full bg-white/10 overflow-hidden">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setLiked(!liked); setDisliked(false); }}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors hover:bg-white/12 border-r border-white/10 ${liked ? "text-blue-400" : "text-white"}`}
                >
                  <ThumbsUp className={`w-4 h-4 ${liked ? "fill-blue-400" : ""}`} />
                  <span className="text-sm">{(video.likes + (liked ? 1 : 0)).toLocaleString()}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setDisliked(!disliked); setLiked(false); }}
                  className={`px-4 py-2 transition-colors hover:bg-white/12 ${disliked ? "text-red-400" : "text-white"}`}
                >
                  <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-red-400" : ""}`} />
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/16 transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/16 transition-colors"
              >
                <Download className="w-4 h-4" /> Save
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/16 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>

          {/* Description card */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="rounded-2xl overflow-hidden mb-5"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="px-4 py-3.5">
              {/* Stats */}
              <div className="flex items-center gap-3 text-sm mb-2.5 flex-wrap">
                <span className="text-white" style={{ fontWeight: 600 }}>{video.views} views</span>
                <span className="text-white/40">{video.uploadedAt}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-xs border border-white/10">
                  {video.category}
                </span>
              </div>
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {video.tags.map((tag) => (
                  <motion.span
                    key={tag}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(`/?q=${encodeURIComponent(tag)}`)}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-500/20 cursor-pointer hover:bg-blue-900/50 transition-colors"
                  >
                    #{tag}
                  </motion.span>
                ))}
              </div>
              {/* Description text */}
              <motion.div
                animate={{ height: descExpanded ? "auto" : "4.5em" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden text-white/60 text-sm leading-relaxed"
              >
                {video.description}
              </motion.div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setDescExpanded(!descExpanded)}
                className="flex items-center gap-1 text-white text-sm mt-2 hover:text-white/80 transition-colors"
                style={{ fontWeight: 600 }}
              >
                {descExpanded ? (<>Show less <ChevronUp className="w-4 h-4" /></>) : (<>Show more <ChevronDown className="w-4 h-4" /></>)}
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT: Recommendations ── */}
        <div className="w-full xl:w-[420px] shrink-0 space-y-3">

          {/* Backend status */}
          <BackendStatusBadge />

          {/* ML Insight Panel */}
          <MLInsightPanel
            insight={insight}
            strictMode={strictMode}
            onToggleStrict={toggleStrictMode}
            fromBackend={recFromBackend}
          />

          {/* Mode pill */}
          <motion.div
            layout
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm ${
              strictMode
                ? "bg-green-950/30 border-green-500/20"
                : "bg-orange-950/30 border-orange-500/20"
            }`}
          >
            {strictMode
              ? <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
              : <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
            }
            <p className={`text-xs ${strictMode ? "text-green-300" : "text-orange-300"}`}>
              {strictMode
                ? <><span style={{ fontWeight: 600 }}>Strict mode ON</span> — only on-topic videos shown</>
                : <><span style={{ fontWeight: 600 }}>Relaxed mode</span> — all videos ranked by ML score</>
              }
            </p>
          </motion.div>

          {/* Rec list */}
          {loadingRecs ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="w-7 h-7 text-purple-400" />
              </motion.div>
              <p className="text-white/30 text-sm">Computing recommendations…</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {visible.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-12 text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center">
                    <ShieldOff className="w-6 h-6 text-white/25" />
                  </div>
                  <p className="text-white/50 text-sm">No on-topic recommendations found</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleStrictMode}
                    className="px-4 py-2 rounded-full bg-white/12 text-white text-sm hover:bg-white/18 transition-colors"
                  >
                    Try Relaxed mode
                  </motion.button>
                </motion.div>
              ) : (
                visible.map((result) => (
                  <RecommendationCard key={result.video.id} result={result} />
                ))
              )}

              {/* Show/hide blocked */}
              {strictMode && blocked.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBlocked(!showBlocked)}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 text-white/35 text-xs hover:text-white/55 hover:border-white/16 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400/60" />
                  {showBlocked
                    ? `Hide ${blocked.length} blocked videos`
                    : `Show ${blocked.length} off-topic blocked videos`
                  }
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}