import { useNavigate, useLocation } from "react-router";
import { motion } from "motion/react";
import { Home, Search, PlusSquare, Bell, User } from "lucide-react";

const TABS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/?search=true" },
  { icon: PlusSquare, label: "Create", path: "/?create=true", isCreate: true },
  { icon: Bell, label: "Inbox", path: "/?inbox=true" },
  { icon: User, label: "You", path: "/?profile=true" },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, delay: 0.1 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "rgba(15,15,15,0.92)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map(({ icon: Icon, label, path, isCreate }) => {
          const isActive = location.pathname + location.search === path ||
            (path === "/" && location.pathname === "/" && !location.search);

          return (
            <motion.button
              key={label}
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl relative"
            >
              {isCreate ? (
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-black" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon
                      className={`w-6 h-6 transition-all duration-200 ${
                        isActive ? "text-white scale-110" : "text-white/50"
                      }`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {/* Active dot */}
                    {isActive && (
                      <motion.div
                        layoutId="bottomnav-active"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-none transition-colors duration-200 ${
                      isActive ? "text-white" : "text-white/40"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
