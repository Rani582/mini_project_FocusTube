import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Home } from "./pages/Home";
import { VideoPlayer } from "./pages/VideoPlayer";
import { motion } from "motion/react";
import { useNavigate } from "react-router";

function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center text-center px-4"
    >
      <div className="text-8xl mb-6">📺</div>
      <h1 className="text-white mb-3" style={{ fontSize: "32px", fontWeight: 700 }}>404 — Page not found</h1>
      <p className="text-white/40 text-base mb-8">This page doesn't exist or has been moved.</p>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/")}
        className="px-6 py-3 bg-white text-black rounded-full text-sm"
        style={{ fontWeight: 600 }}
      >
        Back to Home
      </motion.button>
    </motion.div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "watch/:videoId", Component: VideoPlayer },
      { path: "*", Component: NotFound },
    ],
  },
]);
