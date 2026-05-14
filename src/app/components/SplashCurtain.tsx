import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function SplashCurtain() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0f0f0f]"
        >

          {/* Vignette overlay */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0f0f0f] via-transparent to-[#0f0f0f] opacity-80" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0f0f0f] via-transparent to-[#0f0f0f] opacity-80" />

          {/* Corner Shines (Dark Blue Premium Theme) */}
          <motion.div 
            animate={{ 
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none mix-blend-screen" 
          />
          <motion.div 
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none mix-blend-screen" 
          />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-blue-800/5 blur-[100px] pointer-events-none" />

          {/* Logo / Content */}
          <div className="relative z-20 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 1.5,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="flex flex-col items-center"
            >
              {/* Circular Logo with Rotating Ring */}
              <div className="relative w-48 h-48 mb-10">
                {/* Spinning outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-4 border-2 border-dashed border-purple-500/30 rounded-full"
                />

                {/* Pulsing glow ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-2 bg-gradient-to-tr from-purple-500/40 to-blue-500/40 blur-xl rounded-full"
                />

                {/* The Logo (Forced Circular) */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-[#0f0f0f]"
                >
                  <img
                    src="/app-logo.png"
                    alt="FocusTube Logo"
                    className="w-full h-full object-cover"
                  />

                  {/* Glass sheen reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              </div>

              {/* Text Label */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-center"
              >
                <h1 className="text-white text-4xl font-bold tracking-[-0.05em] mb-1">
                  FocusTube
                </h1>
                <p className="text-purple-400 text-[10px] font-bold tracking-[0.6em] uppercase opacity-80">
                  AI Filtering Engine
                </p>
              </motion.div>


              {/* Status / Loading */}
              <div className="mt-16 flex flex-col items-center gap-4">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-3"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1 h-1 rounded-full bg-purple-400"
                      />
                    ))}
                  </div>
                  <span className="text-white/30 text-[9px] font-bold tracking-[0.5em] uppercase">
                    Syncing Focus Engine
                  </span>
                </motion.div>

                <div className="w-40 h-[1px] bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
