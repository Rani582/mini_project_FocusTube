import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, Compass, Clock, ThumbsUp, PlaySquare, History,
  Flame, Music2, Gamepad2, Newspaper,
  ChevronRight, Brain, Globe, Utensils, Dumbbell,
} from "lucide-react";

const mainNav = [
  { icon: Home, label: "Home", path: "/", activeColor: "text-red-400" },
  { icon: Compass, label: "Shorts", path: "/?tab=shorts", activeColor: "text-pink-400" },
  { icon: PlaySquare, label: "Subscriptions", path: "/?tab=subs", activeColor: "text-blue-400" },
];

const libraryNav = [
  { icon: History, label: "History" },
  { icon: PlaySquare, label: "Your videos" },
  { icon: Clock, label: "Watch later" },
  { icon: ThumbsUp, label: "Liked videos" },
];

const exploreNav = [
  { icon: Flame, label: "Trending", q: "trending", color: "text-orange-400" },
  { icon: Music2, label: "Music", q: "Music", color: "text-pink-400" },
  { icon: Gamepad2, label: "Gaming", q: "Gaming", color: "text-purple-400" },
  { icon: Newspaper, label: "Science", q: "Science", color: "text-blue-400" },
  { icon: Dumbbell, label: "Fitness", q: "Fitness", color: "text-green-400" },
  { icon: Brain, label: "Machine Learning", q: "Machine Learning", color: "text-indigo-400" },
  { icon: Globe, label: "Travel", q: "Travel", color: "text-cyan-400" },
  { icon: Utensils, label: "Cooking", q: "Cooking", color: "text-yellow-400" },
];

const SIDEBAR_FULL_W = 240;
const SIDEBAR_MINI_W = 72;

interface SidebarProps {
  open: boolean;
  mini?: boolean;
}

function NavItem({
  icon: Icon,
  label,
  active,
  mini,
  color = "text-white",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  mini?: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ x: mini ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      title={mini ? label : undefined}
      className={`relative w-full flex items-center transition-all duration-150 group
        ${mini
          ? "flex-col gap-1 py-3 px-1 rounded-2xl justify-center"
          : "gap-5 px-3 py-2.5 rounded-xl"
        }
        ${active
          ? mini
            ? "bg-white/15"
            : "bg-white/12"
          : "hover:bg-white/8"
        }`}
    >
      {/* Active indicator */}
      {active && !mini && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full"
        />
      )}
      <Icon className={`shrink-0 transition-colors ${mini ? "w-5 h-5" : "w-5 h-5"} ${active ? `${color}` : "text-white/70 group-hover:text-white"}`} />
      {mini ? (
        <span className={`text-[9px] leading-none truncate max-w-full ${active ? "text-white" : "text-white/50"}`}>
          {label.split(" ")[0]}
        </span>
      ) : (
        <span className={`text-sm ${active ? "text-white font-medium" : "text-white/80 group-hover:text-white"}`}>
          {label}
        </span>
      )}
    </motion.button>
  );
}

function SectionDivider({ label, mini }: { label?: string; mini?: boolean }) {
  return (
    <div className={`my-2 ${mini ? "px-2" : "px-3"}`}>
      {!mini && label && (
        <p className="text-white/30 text-xs px-3 py-1 uppercase tracking-wider">{label}</p>
      )}
      {(mini || !label) && <div className="h-px bg-white/8 my-1" />}
    </div>
  );
}

export function Sidebar({ open, mini = false }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === "/" && (path === "/" || location.search === path.replace("/", ""));

  return (
    <AnimatePresence initial={false}>
      {open && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => {}}
          />

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            style={{ width: mini ? SIDEBAR_MINI_W : SIDEBAR_FULL_W }}
            className="fixed top-14 left-0 bottom-0 z-40 overflow-y-auto scrollbar-hide"
          >
            {/* Glass background */}
            <div
              className="absolute inset-0"
              style={{
                background: mini
                  ? "rgba(15,15,15,0.95)"
                  : "rgba(15,15,15,0.92)",
                backdropFilter: "blur(12px)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
              }}
            />

            <div className="relative z-10 py-2.5 h-full flex flex-col">
              {/* Main Nav */}
              <div className={`${mini ? "px-2" : "px-3"} space-y-0.5`}>
                {mainNav.map(({ icon, label, path, activeColor }) => (
                  <NavItem
                    key={label}
                    icon={icon}
                    label={label}
                    active={isActive(path)}
                    mini={mini}
                    color={activeColor}
                    onClick={() => navigate(path)}
                  />
                ))}
              </div>

              <SectionDivider label="You" mini={mini} />

              {/* Library */}
              <div className={`${mini ? "px-2" : "px-3"} space-y-0.5`}>
                {!mini && (
                  <div className="flex items-center justify-between px-3 mb-1">
                    <span className="text-white/60 text-xs font-medium">Your Library</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  </div>
                )}
                {libraryNav.map(({ icon, label }) => (
                  <NavItem
                    key={label}
                    icon={icon}
                    label={label}
                    mini={mini}
                    onClick={() => navigate(`/?tab=${label.toLowerCase().replace(" ", "-")}`)}
                  />
                ))}
              </div>

              <SectionDivider label="Explore" mini={mini} />

              {/* Explore Categories */}
              <div className={`${mini ? "px-2" : "px-3"} space-y-0.5 flex-1`}>
                {exploreNav.map(({ icon, label, q, color }) => (
                  <NavItem
                    key={label}
                    icon={icon}
                    label={label}
                    mini={mini}
                    color={color}
                    onClick={() => navigate(`/?q=${encodeURIComponent(q)}`)}
                  />
                ))}
              </div>

              {/* Footer */}
              {!mini && (
                <div className="px-6 pt-4 pb-3 mt-auto">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-purple-300/70 text-[10px] font-medium">FocusTube ML</p>
                  </div>
                  <p className="text-white/20 text-[10px] leading-relaxed">
                    Tag-aware category filtering keeps your feed strictly on-topic
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}