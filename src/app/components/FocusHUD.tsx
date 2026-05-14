import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, Flame, X } from "lucide-react";
import {
  useFocusSession,
  computeFocusScore,
  formatDuration,
  CATEGORY_COLOR,
} from "../../lib/focusSession";

/** Small pill shown in the header during an active focus session */
export function FocusSessionPill() {
  const { session, endSession } = useFocusSession();
  const [, setTick] = useState(0);
  const [showEnd, setShowEnd] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session.isActive || !session.topic) return null;

  const score  = computeFocusScore(session);
  const color  = CATEGORY_COLOR[session.topic];
  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="relative hidden sm:flex items-center gap-2"
    >
      {/* Pill button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowEnd(!showEnd)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-gradient-to-r ${color.from} ${color.to} ${color.border} ${color.text} transition-all`}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-xs" style={{ fontWeight: 600 }}>
          {session.topicEmoji} {session.topic}
        </span>
        <span className="text-white/50 text-xs">·</span>
        <span className="text-white/70 text-xs">{formatDuration(session.startTime)}</span>
        <span className={`text-xs ${scoreColor}`} style={{ fontWeight: 700 }}>{score}%</span>
        <Target className="w-3.5 h-3.5 text-white/50" />
      </motion.button>

      {/* End session popover */}
      <AnimatePresence>
        {showEnd && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(20,20,20,0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{session.topicEmoji}</span>
                <div>
                  <p className="text-white text-sm" style={{ fontWeight: 700 }}>{session.topic} session</p>
                  <p className="text-white/40 text-xs">{formatDuration(session.startTime)} · {session.videosWatched} videos</p>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Focus", value: `${score}%`, color: scoreColor },
                  { label: "On track", value: `${session.onTopicCount}/${session.videosWatched}`, color: "text-green-400" },
                  { label: "Streak", value: `${session.currentStreak}🔥`, color: "text-orange-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/6 rounded-xl p-2 text-center">
                    <p className={`text-sm ${color}`} style={{ fontWeight: 700 }}>{value}</p>
                    <p className="text-white/30 text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { endSession(); setShowEnd(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/25 text-sm hover:bg-red-500/30 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <X className="w-4 h-4" />
                End focus session
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Banner shown at top of video player when session is active */
export function FocusSessionBanner({ videoCategory }: { videoCategory: string }) {
  const { session } = useFocusSession();

  if (!session.isActive || !session.topic) return null;

  const isOnTopic   = session.topic === videoCategory;
  const score       = computeFocusScore(session);
  const scoreColor  = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 border ${
        isOnTopic
          ? "bg-green-950/30 border-green-500/20"
          : "bg-orange-950/30 border-orange-500/25"
      }`}
    >
      <span className="text-xl">{session.topicEmoji}</span>
      <div className="flex-1 min-w-0">
        {isOnTopic ? (
          <p className="text-green-300 text-sm" style={{ fontWeight: 600 }}>
            ✅ On track — this fits your <span className="text-white">{session.topic}</span> session
          </p>
        ) : (
          <p className="text-orange-300 text-sm" style={{ fontWeight: 600 }}>
            ⚠️ You came for <span className="text-white">{session.topic}</span>, this is{" "}
            <span className="text-white">{videoCategory}</span>
          </p>
        )}
        <p className="text-white/35 text-xs mt-0.5">
          {formatDuration(session.startTime)} in · Focus score{" "}
          <span className={scoreColor} style={{ fontWeight: 700 }}>{score}%</span>
        </p>
      </div>
      {session.currentStreak >= 2 && isOnTopic && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/25">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-300 text-xs" style={{ fontWeight: 700 }}>{session.currentStreak}</span>
        </div>
      )}
    </motion.div>
  );
}

/** Full-width floating session summary card shown at end of session */
export function SessionEndModal({ onClose }: { onClose: () => void }) {
  const { session, endSession } = useFocusSession();

  const score    = computeFocusScore(session);
  const duration = formatDuration(session.startTime);

  let grade = { label: "Focus Master", emoji: "🏆", color: "text-yellow-300" };
  if (score < 80) grade = { label: "Good Effort", emoji: "💪", color: "text-blue-300" };
  if (score < 50) grade = { label: "Keep Trying", emoji: "🎯", color: "text-purple-300" };

  const handleEnd = () => { endSession(); onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "rgba(18,18,18,0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        <div className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.1 }}
            className="text-6xl mb-3"
          >
            {grade.emoji}
          </motion.div>
          <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "22px" }}>
            Session Complete!
          </h2>
          <p className={`text-sm mb-5 ${grade.color}`} style={{ fontWeight: 600 }}>
            {grade.label}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Topic", value: `${session.topicEmoji} ${session.topic}` },
              { label: "Duration", value: duration },
              { label: "Focus Score", value: `${score}%`, highlight: score >= 80 ? "text-green-400" : "text-yellow-400" },
              { label: "Best Streak", value: `${session.bestStreak} 🔥` },
              { label: "On-Topic", value: `${session.onTopicCount} / ${session.videosWatched}` },
              { label: "Distractions", value: `${session.offTopicAttempts} blocked` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-white/6 rounded-2xl p-3">
                <p className="text-white/35 text-[10px] mb-1">{label}</p>
                <p className={`text-sm ${highlight ?? "text-white"}`} style={{ fontWeight: 700 }}>{value}</p>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleEnd}
            className="w-full py-3 rounded-2xl bg-white text-black text-sm"
            style={{ fontWeight: 700 }}
          >
            Done — go home
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
