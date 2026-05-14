import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CATEGORIES } from "../../lib/videoData";
import { searchVideos, fetchVideos } from "../../lib/apiService";
import { VideoCard } from "../components/VideoCard";
import {
  Flame, Loader2, ChevronLeft, ChevronRight, Play, TrendingUp,
  Target, X, Zap, ChevronDown, CheckCircle2, ShieldAlert
} from "lucide-react";
import type { Video } from "../../lib/videoData";
import {
  useFocusSession,
  CATEGORY_EMOJI,
  CATEGORY_COLOR,
  CATEGORY_DESCRIPTION,
  FocusCategory,
  computeFocusScore,
  formatDuration,
} from "../../lib/focusSession";

const ALL = "All";

const CATEGORY_ICONS: Record<string, string> = {
  "All": "🎯",
  "Machine Learning": "🤖",
  "Web Development": "💻",
  "Cooking": "🍳",
  "Gaming": "🎮",
  "Fitness": "💪",
  "Music": "🎵",
  "Travel": "✈️",
  "Science": "🔬",
  "Shorts": "⚡",
};

// ── Hero featured videos ──────────────────────────────────────────────────
// We'll populate these from the fetched videos
const DEFAULT_HERO_VIDEOS: Video[] = [
  {
    id: "sc-003",
    title: "Black Holes: Everything We Know (2025 Update)",
    description: "Updated with latest discoveries — event horizons, Hawking radiation, black hole imaging, and what happens when you fall into one.",
    category: "Science",
    tags: ["black holes", "astrophysics", "space"],
    thumbnail: "https://images.unsplash.com/photo-1774277602359-d5dfed73aa98",
    duration: "41:53",
    views: "18.7M",
    likes: 821000,
    channel: "ScienceNow",
    channelAvatar: "https://api.dicebear.com/7.x/initials/svg?seed=SN",
    uploadedAt: "3 months ago",
    subscribers: "2.3M"
  }
];

// ── Focus Intent Card ─────────────────────────────────────────────────────
function FocusIntentCard() {
  const { session, startSession, endSession } = useFocusSession();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!session.isActive) return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [session.isActive]);

  const score = computeFocusScore(session);
  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  // ── Active session banner ────────────────────────────────────────────────
  if (session.isActive && session.topic) {
    const color = CATEGORY_COLOR[session.topic];
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl border overflow-hidden mb-5 bg-gradient-to-r ${color.from} ${color.to} ${color.border}`}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-4 py-3"
        >
          {/* Pulsing live dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
          </span>
          <span className="text-xl">{session.topicEmoji}</span>
          <div className="flex-1 text-left min-w-0">
            <p className={`text-sm ${color.text}`} style={{ fontWeight: 700 }}>
              Focused on <span className="text-white">{session.topic}</span>
            </p>
            <p className="text-white/40 text-xs">
              {formatDuration(session.startTime)} · {session.videosWatched} watched · {session.currentStreak}🔥 streak
            </p>
          </div>
          <span className={`text-sm ${scoreColor}`} style={{ fontWeight: 700 }}>{score}%</span>
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {[
                    { label: "Focus score", value: `${score}%`, c: scoreColor },
                    { label: "On track", value: `${session.onTopicCount}/${session.videosWatched}`, c: "text-green-400" },
                    { label: "Distractions", value: `${session.offTopicAttempts}`, c: "text-orange-400" },
                  ].map(({ label, value, c }) => (
                    <div key={label} className="bg-white/8 rounded-xl px-3 py-2 text-center">
                      <p className={`text-sm ${c}`} style={{ fontWeight: 700 }}>{value}</p>
                      <p className="text-white/40 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { endSession(); setOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/25 text-sm hover:bg-red-500/30 transition-colors shrink-0"
                  style={{ fontWeight: 600 }}
                >
                  <X className="w-3.5 h-3.5" /> End session
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── No session — intent prompt ───────────────────────────────────────────
  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 border border-white/8 text-left transition-colors hover:bg-white/5"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="w-9 h-9 rounded-xl bg-purple-600/25 flex items-center justify-center shrink-0">
          <Target className="w-4.5 h-4.5 text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm" style={{ fontWeight: 600 }}>What are you here to watch?</p>
          <p className="text-white/35 text-xs">Set your intent — FocusTube keeps you on track</p>
        </div>
        <span className="text-white/25 text-xs hidden sm:block">Tap to focus →</span>
      </motion.button>
    );
  }

  // ── Category picker ──────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-2xl border border-purple-500/20 overflow-hidden mb-5"
      style={{ background: "rgba(88,28,135,0.12)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-white" style={{ fontWeight: 700, fontSize: "15px" }}>
            What do you actually want to watch?
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            Pick a topic. FocusTube's ML blocks the rabbit holes.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(false)}
          className="p-1.5 text-white/30 hover:text-white transition-colors rounded-full"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pb-4">
        {CATEGORIES.map((cat, i) => {
          const color = CATEGORY_COLOR[cat];
          return (
            <motion.button
              key={cat}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { startSession(cat as FocusCategory); setOpen(false); }}
              className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border bg-gradient-to-br ${color.from} ${color.to} ${color.border} hover:border-white/20 transition-all`}
            >
              <span className="text-2xl">{CATEGORY_EMOJI[cat]}</span>
              <div className="text-center">
                <p className={`text-xs ${color.text}`} style={{ fontWeight: 700 }}>{cat}</p>
                <p className="text-white/30 text-[10px] mt-0.5 leading-tight">
                  {CATEGORY_DESCRIPTION[cat]}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/6 bg-white/3">
        <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <p className="text-white/40 text-xs">
          Once set, the ML model only shows videos that match your topic. No more accidental spirals.
        </p>
      </div>
    </motion.div>
  );
}

function HeroBanner({ videos = DEFAULT_HERO_VIDEOS }: { videos?: Video[] }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayVideos = videos.length > 0 ? videos.slice(0, 5) : DEFAULT_HERO_VIDEOS;

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % displayVideos.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, displayVideos.length]);

  const video = displayVideos[current];
  if (!video) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl mb-6"
      style={{ height: "clamp(200px, 35vw, 420px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-medium mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-red-400" />
              {video.category}
            </span>
            <h2 className="text-white text-xl md:text-3xl max-w-xl leading-tight mb-2 drop-shadow-lg" style={{ fontWeight: 700 }}>
              {video.title}
            </h2>
            <p className="text-white/60 text-sm hidden md:block max-w-md line-clamp-2 mb-4">
              {video.description}
            </p>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(`/watch/${video.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Play className="w-4 h-4" fill="black" />
                Watch Now
              </motion.button>
              <div className="text-white/50 text-sm">
                {video.views} views · {video.channel}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev/Next arrows */}
      <button
        onClick={() => setCurrent((c) => (c - 1 + displayVideos.length) % displayVideos.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => setCurrent((c) => (c + 1) % displayVideos.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-6 flex gap-1.5">
        {displayVideos.map((_video: Video, i: number) => (
          <motion.button
            key={i}
            onClick={() => setCurrent(i)}
            animate={{ width: i === current ? 20 : 6, opacity: i === current ? 1 : 0.4 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="h-1.5 rounded-full bg-white"
          />
        ))}
      </div>
    </div>
  );
}

function CategoryChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (cat: string) => void;
}) {
  const { session } = useFocusSession();
  const chips = [ALL, ...CATEGORIES];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center mb-6 -mx-4 px-4">
      {canScrollLeft && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => scroll("left")}
          className="absolute left-4 z-10 w-8 h-8 rounded-full bg-[#0f0f0f] shadow-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>
      )}
      {canScrollLeft && (
        <div className="absolute left-4 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f0f0f] to-transparent z-[5] pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 w-full"
      >
        {chips.map((chip, i) => {
          const isActive = chip === active;
          const isFocusedTopic = session.isActive && chip === session.topic;
          return (
            <motion.button
              key={chip}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onChange(chip)}
              className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/80 hover:bg-white/18 hover:text-white"
              }`}
              style={{ fontWeight: isActive ? 600 : 400 }}
            >
              <span className="text-base leading-none">{CATEGORY_ICONS[chip] ?? "🎯"}</span>
              {chip}
              {/* Green dot for current focus topic */}
              {isFocusedTopic && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
              {isActive && (
                <motion.div
                  layoutId="chip-active"
                  className="absolute inset-0 rounded-xl bg-white"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {canScrollRight && (
        <div className="absolute right-4 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f0f0f] to-transparent z-[5] pointer-events-none" />
      )}
      {canScrollRight && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => scroll("right")}
          className="absolute right-4 z-10 w-8 h-8 rounded-full bg-[#0f0f0f] shadow-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}

function VideoGrid({ videos, title, icon: Icon, onSeeAll }: {
  videos: Video[];
  title?: string;
  icon?: React.ElementType;
  onSeeAll?: () => void;
}) {
  return (
    <section className="mb-10">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-white/60" />}
            <h2 className="text-white" style={{ fontWeight: 600, fontSize: "17px" }}>{title}</h2>
          </div>
          {onSeeAll && (
            <motion.button
              whileHover={{ x: 2 }}
              onClick={onSeeAll}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              See all <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-6">
        {videos.map((video, i) => (
          <VideoCard key={video.id} video={video} index={i} />
        ))}
      </div>
    </section>
  );
}

export function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, toggleStrictMode } = useFocusSession();
  const strictMode = session.strictMode;
  const query = searchParams.get("q") ?? "";
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchVideos(query).then(({ videos }) => {
      setSearchResults(videos);
      setSearching(false);
    });
  }, [query]);

  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const duration = activeCategory === "Shorts" ? "short" : undefined;
    const cat = activeCategory === "Shorts" || activeCategory === ALL ? undefined : activeCategory;
    
    fetchVideos(cat, duration).then(({ videos }) => {
      setAllVideos(videos);
      setLoading(false);
    });
  }, [activeCategory]);

  const categoryFiltered = allVideos; // Since we now fetch per category

  const filteredSearchResults = useMemo(() => {
    if (strictMode && session.isActive && session.topic) {
      return searchResults.filter((v) => v.category === session.topic);
    }
    return searchResults;
  }, [searchResults, strictMode, session.isActive, session.topic]);

  const isSearchMode = !!query;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] relative overflow-hidden">
      {/* Background theme glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div 
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[15%] -left-[5%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[140px]" 
        />
        <motion.div 
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[15%] -right-[5%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[140px]" 
        />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>
      {/* Sticky chips bar */}
      <div
        className="sticky top-14 z-30 px-4 pt-3 pb-1"
        style={{
          background: "rgba(15,15,15,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {!isSearchMode && (
          <CategoryChips active={activeCategory} onChange={handleCategoryChange} />
        )}
      </div>

      <div className="px-4 py-5 max-w-[1700px] mx-auto">

        {/* ── Focus intent card (always shown when not searching) ── */}
        {!isSearchMode && <FocusIntentCard />}

        {/* ── Search Mode ── */}
        {isSearchMode && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-white/50 text-sm mb-1">Results for</p>
              <h1 className="text-white" style={{ fontSize: "22px", fontWeight: 700 }}>"{query}"</h1>
              {!searching && (
                <p className="text-white/30 text-sm mt-1">
                  {filteredSearchResults.length} video{filteredSearchResults.length !== 1 ? "s" : ""} found
                  {strictMode && session.isActive && (
                    <span className="text-green-500/60 ml-2"> (Strict filtering active)</span>
                  )}
                </p>
              )}
            </motion.div>

            {searching ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-8 h-8 text-purple-400" />
                </motion.div>
                <p className="text-white/40 text-sm">Searching…</p>
              </div>
            ) : searchResults.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-white/8 flex items-center justify-center mb-5">
                  <Flame className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-white text-lg mb-2" style={{ fontWeight: 600 }}>No results found</p>
                <p className="text-white/40 text-sm mb-5">Try different keywords or browse categories</p>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate("/")}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-sm"
                  style={{ fontWeight: 600 }}
                >
                  Browse Home
                </motion.button>
              </motion.div>
            ) : (
              <>
                <VideoGrid videos={filteredSearchResults} />
                {filteredSearchResults.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40 max-w-xs text-sm">
                      No videos matching your focus topic "{session.topic}" were found.
                    </p>
                    <button 
                      onClick={toggleStrictMode}
                      className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Turn off Strict Mode to see all {searchResults.length} results
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Browse Mode ── */}
        {!isSearchMode && loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-purple-400" />
            </motion.div>
            <p className="text-white/40 text-sm">Initializing FocusTube…</p>
          </div>
        ) : !isSearchMode && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeCategory === ALL ? (
                <>
                  {/* Hero banner */}
                  <HeroBanner videos={allVideos} />

                  {/* Focus-mode callout when session is active */}
                  {session.isActive && session.topic && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 border border-green-500/20 bg-green-950/20"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                      <p className="text-green-300 text-sm" style={{ fontWeight: 500 }}>
                        You're in focus mode for <span className="text-white font-semibold">{session.topic}</span>
                        {" "}— switch to that tab to stay on track, or browse freely here.
                      </p>
                    </motion.div>
                  )}

                  {/* Trending row */}
                  <VideoGrid
                    videos={allVideos.slice(0, 5)}
                    title="🔥 Trending Now"
                    icon={Flame}
                  />

                  {/* All categories */}
                  {CATEGORIES.map((cat) => {
                    const catVideos = allVideos.filter((v) => v.category === cat);
                    if (catVideos.length === 0) return null;
                    return (
                      <VideoGrid
                        key={cat}
                        videos={catVideos}
                        title={`${CATEGORY_ICONS[cat]} ${cat}`}
                        onSeeAll={() => handleCategoryChange(cat)}
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Category header */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <span className="text-4xl">{CATEGORY_ICONS[activeCategory]}</span>
                    <div>
                      <h1 className="text-white" style={{ fontWeight: 700, fontSize: "24px" }}>
                        {activeCategory}
                      </h1>
                      <p className="text-white/40 text-sm">{categoryFiltered.length} videos</p>
                    </div>
                    {/* Quick focus this category */}
                    {!session.isActive && (
                      <FocusThisCategoryButton category={activeCategory as FocusCategory} />
                    )}
                  </motion.div>

                  <VideoGrid videos={categoryFiltered} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/** Small inline "Focus on X" button shown in category header */
function FocusThisCategoryButton({ category }: { category: FocusCategory }) {
  const { startSession } = useFocusSession();
  if (!category) return null;
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => startSession(category)}
      className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300 text-sm hover:bg-purple-900/35 transition-colors"
      style={{ fontWeight: 600 }}
    >
      <Target className="w-3.5 h-3.5" />
      Focus on {CATEGORY_EMOJI[category as string] ?? ""} {category}
    </motion.button>
  );
}
