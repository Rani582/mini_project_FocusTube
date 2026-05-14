import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key, CheckCircle2, XCircle, Loader2, Eye, EyeOff,
  ExternalLink, Trash2, Youtube, AlertTriangle, Info,
} from "lucide-react";
import {
  getYouTubeApiKey,
  setYouTubeApiKey,
  clearYouTubeApiKey,
  validateYouTubeApiKey,
  hasYouTubeApiKey,
  type YTError,
} from "../../lib/youtubeService";

type KeyStatus = "idle" | "validating" | "valid" | "error";

interface Props {
  onClose: () => void;
  onKeyChange?: () => void;
}

export function YouTubeSettingsPanel({ onClose, onKeyChange }: Props) {
  const [input, setInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<KeyStatus>("idle");
  const [error, setError] = useState<YTError | null>(null);
  const [currentKey, setCurrentKey] = useState(getYouTubeApiKey());

  useEffect(() => {
    if (currentKey) setInput(currentKey);
  }, []);

  const maskedKey = currentKey
    ? `${currentKey.slice(0, 8)}${"•".repeat(Math.max(0, currentKey.length - 12))}${currentKey.slice(-4)}`
    : "";

  const handleSave = async () => {
    const key = input.trim();
    if (!key) return;
    setStatus("validating");
    setError(null);
    const err = await validateYouTubeApiKey(key);
    if (err) {
      setStatus("error");
      setError(err);
    } else {
      setYouTubeApiKey(key);
      setCurrentKey(key);
      setStatus("valid");
      onKeyChange?.();
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleClear = () => {
    clearYouTubeApiKey();
    setCurrentKey("");
    setInput("");
    setStatus("idle");
    setError(null);
    onKeyChange?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 24 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: "rgba(18,18,18,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/8">
          <div className="w-10 h-10 rounded-2xl bg-red-600/25 flex items-center justify-center">
            <Youtube className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-white" style={{ fontWeight: 700, fontSize: "17px" }}>
              YouTube API Key
            </h2>
            <p className="text-white/40 text-xs">
              Enables real YouTube search & video data
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current key status */}
          {currentKey && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-950/30 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-green-300 text-sm" style={{ fontWeight: 600 }}>API key is active</p>
                <p className="text-white/35 text-xs font-mono truncate">{maskedKey}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <label className="text-white/60 text-xs" style={{ fontWeight: 600 }}>
              {currentKey ? "Replace key" : "Enter your API key"}
            </label>
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-3 border transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor:
                  status === "valid"
                    ? "rgba(34,197,94,0.4)"
                    : status === "error"
                    ? "rgba(239,68,68,0.4)"
                    : "rgba(255,255,255,0.12)",
              }}
            >
              <Key className="w-4 h-4 text-white/30 shrink-0" />
              <input
                type={showKey ? "text" : "password"}
                value={input}
                onChange={(e) => { setInput(e.target.value); setStatus("idle"); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                placeholder="AIzaSy..."
                className="flex-1 bg-transparent text-white placeholder-white/20 text-sm outline-none font-mono"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowKey(!showKey)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-950/30 border border-red-500/20"
              >
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm" style={{ fontWeight: 600 }}>
                    {error.code === "invalid_key" ? "Invalid API key" :
                     error.code === "quota_exceeded" ? "Quota exceeded" : "Error"}
                  </p>
                  <p className="text-red-300/60 text-xs mt-0.5">{error.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How to get a key */}
          <div className="px-4 py-3.5 rounded-2xl border border-white/6" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-white/60 text-xs" style={{ fontWeight: 600 }}>How to get a YouTube API key</p>
            </div>
            <ol className="space-y-1.5">
              {[
                { step: "1", text: "Go to Google Cloud Console", link: "https://console.cloud.google.com" },
                { step: "2", text: "Create or select a project" },
                { step: "3", text: "Enable \"YouTube Data API v3\"" },
                { step: "4", text: "Create an API key under Credentials" },
              ].map(({ step, text, link }) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="w-4.5 h-4.5 rounded-full bg-white/10 text-white/50 text-[10px] flex items-center justify-center shrink-0" style={{ fontWeight: 700 }}>
                    {step}
                  </span>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                    >
                      {text} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-white/40 text-xs">{text}</span>
                  )}
                </li>
              ))}
            </ol>
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-white/6">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-white/30 text-[11px] leading-relaxed">
                Free tier: 10,000 units/day. Restrict your key to YouTube Data API v3 for security.
                Never share API keys publicly.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-white/12 text-white/60 text-sm hover:bg-white/8 transition-colors"
            style={{ fontWeight: 600 }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={!input.trim() || status === "validating"}
            className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-red-500"
            style={{ fontWeight: 600 }}
          >
            {status === "validating" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Validating…
              </span>
            ) : status === "valid" ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            ) : (
              "Save & Verify"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Compact badge shown in header/settings indicating API key status */
export function YouTubeApiBadge({ onClick }: { onClick: () => void }) {
  const active = hasYouTubeApiKey();
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
        active
          ? "bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
          : "bg-white/8 border-white/12 text-white/50 hover:bg-white/12 hover:text-white/70"
      }`}
      style={{ fontWeight: 600 }}
    >
      <Youtube className="w-3.5 h-3.5" />
      {active ? "YouTube Live" : "Add API Key"}
    </motion.button>
  );
}
