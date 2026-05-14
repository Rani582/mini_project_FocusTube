import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Play, MoreVertical, Clock, ThumbsUp, BookmarkPlus } from "lucide-react";
import { Video } from "../../lib/videoData";

interface VideoCardProps {
  video: Video;
  horizontal?: boolean;
  index?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Machine Learning": "from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/20",
  "Web Development": "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/20",
  "Cooking": "from-orange-500/20 to-yellow-500/20 text-orange-300 border-orange-500/20",
  "Gaming": "from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/20",
  "Fitness": "from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/20",
  "Music": "from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-500/20",
  "Travel": "from-teal-500/20 to-cyan-500/20 text-teal-300 border-teal-500/20",
  "Science": "from-violet-500/20 to-blue-500/20 text-violet-300 border-violet-500/20",
  "Shorts": "from-red-500/20 to-orange-500/20 text-red-300 border-red-500/20",
};



export function VideoCard({ video, horizontal = false, index = 0 }: VideoCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const catColor = CATEGORY_COLORS[video.category] ?? "from-white/10 to-white/5 text-white/60 border-white/10";

  if (horizontal) {
    return (
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate(`/watch/${video.id}`)}
        className="flex gap-3 w-full text-left group"
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        {/* Thumbnail */}
        <div className={`relative shrink-0 ${video.category === "Shorts" ? "w-28 aspect-[9/16]" : "w-44 aspect-video"} rounded-xl overflow-hidden bg-white/8`}>
          <motion.img
            src={video.thumbnail}
            alt={video.title}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Duration badge */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium">
            {video.duration}
          </div>
          {/* Play overlay */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <motion.div
              animate={{ scale: hovered ? 1 : 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
            </motion.div>
          </motion.div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-white text-sm line-clamp-2 leading-snug mb-1 group-hover:text-white/90 transition-colors">
            {video.title}
          </p>
          <p className="text-white/50 text-xs">{video.channel}</p>
          <p className="text-white/35 text-xs mt-0.5">
            {video.views} views · {video.uploadedAt}
          </p>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="flex flex-col group cursor-pointer"
      onClick={() => navigate(`/watch/${video.id}`)}
    >
      {/* Thumbnail */}
      <div className={`relative w-full ${video.category === "Shorts" ? "aspect-[9/16]" : "aspect-video"} rounded-2xl overflow-hidden bg-white/8 mb-3`}>
        <motion.img
          src={video.thumbnail}
          alt={video.title}
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Top gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Duration */}
        <motion.div
          animate={{ y: hovered ? -4 : 0, opacity: hovered ? 0.9 : 1 }}
          transition={{ duration: 0.25 }}
          className="absolute bottom-2 right-2 bg-black/85 text-white text-[11px] px-2 py-1 rounded-lg font-mono font-medium"
        >
          {video.duration}
        </motion.div>

        {/* Play button */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-2 right-2 flex gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>

      {/* Info row */}
      <div className="flex gap-2.5">
        {/* Avatar */}
        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
          <img
            src={video.channelAvatar}
            alt={video.channel}
            className="w-9 h-9 rounded-full shrink-0 bg-white/10 ring-2 ring-transparent hover:ring-white/20 transition-all"
          />
        </motion.div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-white text-sm line-clamp-2 leading-snug mb-1 group-hover:text-white/90 transition-colors">
            {video.title}
          </p>
          {/* Channel + meta */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-white/50 text-xs hover:text-white/80 transition-colors block truncate"
          >
            {video.channel}
          </button>
          <p className="text-white/35 text-xs mt-0.5">
            {video.views} views · {video.uploadedAt}
          </p>
          {/* Category chip */}
          <div className={`inline-flex mt-1.5 items-center px-2 py-0.5 rounded-full bg-gradient-to-r border text-[10px] font-medium ${catColor}`}>
            {video.category}
          </div>
        </div>

        {/* More menu */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </motion.button>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-8 w-44 rounded-xl overflow-hidden z-20"
              style={{
                background: "rgba(30,30,30,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              }}
            >
              {[
                { icon: Clock, label: "Save to Watch later" },
                { icon: BookmarkPlus, label: "Save to playlist" },
                { icon: ThumbsUp, label: "Like" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 text-white/70 hover:text-white text-sm transition-colors text-left"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
