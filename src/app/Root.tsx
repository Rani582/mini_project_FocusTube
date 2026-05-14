import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FocusSessionProvider } from "./components/FocusSessionProvider";
import { SplashCurtain } from "./components/SplashCurtain";

type SidebarMode = "full" | "mini" | "closed";

export function Root() {
  const location = useLocation();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("full");
  const isWatchPage = location.pathname.startsWith("/watch");

  // Auto-switch to mini on watch pages (YouTube-style)
  useEffect(() => {
    if (isWatchPage) {
      setSidebarMode("mini");
    }
  }, [isWatchPage]);

  const toggleSidebar = () => {
    setSidebarMode((prev) => {
      if (prev === "full") return "mini";
      if (prev === "mini") return "closed";
      return "full";
    });
  };

  const sidebarOpen = sidebarMode !== "closed";
  const sidebarMini = sidebarMode === "mini";

  const mainPadding = sidebarOpen
    ? sidebarMini
      ? 72
      : 240
    : 0;

  return (
    <FocusSessionProvider>
      <SplashCurtain />
      <div className="bg-[#0f0f0f] min-h-screen">
        <Header onMenuToggle={toggleSidebar} sidebarOpen={sidebarOpen} />

        <Sidebar open={sidebarOpen} mini={sidebarMini} />

        {/* Main content — smoothly shifts with sidebar */}
        <motion.main
          animate={{ paddingLeft: mainPadding }}
          transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
          className="pt-14 pb-20 md:pb-0"
        >
          {/* Page transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname + location.search.split("&")[0]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </motion.main>

        {/* iOS-style mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </FocusSessionProvider>
  );
}