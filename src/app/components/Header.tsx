import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Bell, Menu, Mic, Upload, X, Sparkles,
  TrendingUp, Clock, ChevronRight, Settings, User,
  Moon, HelpCircle, LogOut, Keyboard, ShieldCheck, ShieldAlert
} from "lucide-react";
import { FocusSessionPill } from "./FocusHUD";
import { useFocusSession } from "../../lib/focusSession";

interface HeaderProps {
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

const SUGGESTIONS = [
  "neural networks explained",
  "react 18 new features",
  "sourdough bread recipe",
  "elden ring guide",
  "HIIT workout beginner",
  "music theory basics",
  "japan travel budget",
  "quantum computing explained",
];

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  
  const { session, toggleStrictMode } = useFocusSession();

  const filteredSuggestions = query
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : SUGGESTIONS.slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/");
    }
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    navigate(`/?q=${encodeURIComponent(s)}`);
    setShowSuggestions(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const recentVideos: any[] = [];

  return (
    <>
      <motion.header
        initial={false}
        className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{
          background: "rgba(15,15,15,0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center h-full px-3 md:px-4 gap-2">

          {/* ── Left: Menu + Logo ── */}
          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onMenuToggle}
              className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 ml-1 px-1"
            >
              {/* Custom logo mark (Forced Circular) */}
              <div className="relative w-8 h-8 flex items-center justify-center rounded-full overflow-hidden border border-white/10 shadow-lg bg-[#0f0f0f]">
                <img src="/app-logo.png" alt="FocusTube Logo" className="w-full h-full object-cover" />
              </div>
              <span className="hidden sm:flex flex-col leading-none">
                <span className="text-white tracking-tight" style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }}>
                  FocusTube
                </span>
                <span className="text-purple-400" style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "1.5px" }}>
                  AI
                </span>
              </span>
            </motion.button>
          </div>

          {/* ── Center: Search ── */}
          <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto">
            {/* Desktop search */}
            <div className="hidden md:flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <form onSubmit={handleSearch}>
                  <motion.div
                    animate={{
                      boxShadow: focused
                        ? "0 0 0 2px rgba(168,85,247,0.4), 0 4px 20px rgba(0,0,0,0.3)"
                        : "0 0 0 1px rgba(255,255,255,0.1)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center rounded-full overflow-hidden bg-[#121212]"
                  >
                    {focused && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pl-4"
                      >
                        <Search className="w-4 h-4 text-purple-400" />
                      </motion.div>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => { setFocused(true); setShowSuggestions(true); }}
                      onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150); }}
                      placeholder="Search videos, channels, topics…"
                      className="flex-1 bg-transparent text-white placeholder-white/30 px-4 py-2.5 text-sm outline-none min-w-0"
                    />
                    {query && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        type="button"
                        onClick={() => { setQuery(""); navigate("/"); inputRef.current?.focus(); }}
                        className="px-3 text-white/40 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                    
                    {/* Strict Mode Toggle */}
                    <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.preventDefault(); toggleStrictMode(); }}
                      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                        session.strictMode 
                          ? "text-green-400 bg-green-500/10 border-green-500/20" 
                          : "text-orange-400 bg-orange-500/10 border-orange-500/20"
                      }`}
                      title={session.strictMode ? "Strict Mode: ON (Safe)" : "Strict Mode: OFF (Relaxed)"}
                    >
                      <div className="relative flex items-center justify-center">
                        <motion.div
                          animate={{ 
                            scale: session.strictMode ? [1, 1.2, 1] : 1,
                            rotate: session.strictMode ? 0 : 180
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {session.strictMode ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        </motion.div>
                        {session.strictMode && (
                          <motion.div
                            layoutId="strict-glow"
                            className="absolute inset-0 bg-green-400/20 blur-sm rounded-full"
                            initial={false}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">
                        {session.strictMode ? "Strict" : "Relaxed"}
                      </span>
                    </motion.button>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-white/8 hover:bg-white/14 text-white/70 hover:text-white border-l border-white/10 transition-all flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </motion.div>
                </form>

                {/* Search suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                      style={{
                        background: "rgba(28,28,28,0.97)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                      }}
                    >
                      {filteredSuggestions.length > 0 && (
                        <div className="py-2">
                          {filteredSuggestions.map((s, i) => (
                            <motion.button
                              key={s}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onMouseDown={() => handleSuggestion(s)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-colors text-left"
                            >
                              <Search className="w-4 h-4 text-white/30 shrink-0" />
                              <span className="text-white/80 text-sm">{s}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto" />
                            </motion.button>
                          ))}
                        </div>
                      )}
                      {/* Recent watched */}
                      <div className="border-t border-white/8 py-2">
                        <p className="px-4 py-1 text-white/30 text-xs uppercase tracking-wider">Recent</p>
                        {recentVideos.map((v) => (
                          <button
                            key={v.id}
                            onMouseDown={() => navigate(`/watch/${v.id}`)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/8 transition-colors text-left"
                          >
                            <Clock className="w-3.5 h-3.5 text-white/30 shrink-0" />
                            <span className="text-white/60 text-xs truncate">{v.title}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Voice search */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                className="p-2.5 rounded-full bg-white/8 hover:bg-white/14 text-white transition-colors shrink-0"
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Mobile search icon */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileSearch(true)}
              className="md:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <Search className="w-5 h-5" />
            </motion.button>
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-0.5 shrink-0">

            {/* Focus session pill (shown when a session is active) */}
            <AnimatePresence>
              <FocusSessionPill />
            </AnimatePresence>

            {/* Create */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 text-white text-sm hover:bg-white/10 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Create</span>
            </motion.button>

            {/* Notifications */}
            <div className="relative" ref={notifsRef}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }}
                className="relative p-2 rounded-full text-white hover:bg-white/10 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0f0f0f]"
                />
              </motion.button>

              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: "rgba(28,28,28,0.98)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                      <p className="text-white font-semibold text-sm">Notifications</p>
                      <button className="text-blue-400 text-xs hover:text-blue-300 transition-colors">Mark all read</button>
                    </div>
                    {[
                      { channel: "AI Academy", msg: "uploaded: Neural Networks Explained from Scratch", time: "2h ago", dot: true },
                      { channel: "FitForce", msg: "New: 30-Minute HIIT Workout is trending", time: "5h ago", dot: true },
                      { channel: "DeepMind Hub", msg: "Your liked video has 1M views now!", time: "1d ago", dot: false },
                    ].map((n, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${n.dot ? "bg-purple-950/20" : ""}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {n.channel[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-xs leading-snug">
                            <span className="text-white font-medium">{n.channel}</span> {n.msg}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">{n.time}</p>
                        </div>
                        {n.dot && <div className="w-2 h-2 bg-blue-400 rounded-full shrink-0 mt-1.5" />}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
                className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent hover:ring-white/30 transition-all"
              >
                U
              </motion.button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: "rgba(28,28,28,0.98)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}
                  >
                    {/* User info */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/8">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        U
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Your Channel</p>
                        <p className="text-white/40 text-xs">@yourchannel</p>
                      </div>
                    </div>
                    {/* Menu items */}
                    {[
                      { icon: User, label: "Your profile" },
                      { icon: Sparkles, label: "FocusTube AI insights" },
                      { icon: TrendingUp, label: "Watch history" },
                      { icon: Settings, label: "Settings" },
                      { icon: Keyboard, label: "Keyboard shortcuts" },
                      { icon: HelpCircle, label: "Help & feedback" },
                      { icon: Moon, label: "Appearance: Dark" },
                    ].map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 text-white/70 hover:text-white transition-colors text-left"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                    <div className="border-t border-white/8 mt-1">
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 text-red-400 hover:text-red-300 transition-colors text-left">
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span className="text-sm">Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile full-screen search overlay ── */}
      <AnimatePresence>
        {mobileSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
            style={{ background: "rgba(15,15,15,0.97)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center gap-3 p-4 pt-5">
              <motion.button
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileSearch(false)}
                className="p-2 rounded-full text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </motion.button>
              <form onSubmit={(e) => { handleSearch(e); setMobileSearch(false); }} className="flex-1">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-full px-4 py-2.5 text-sm outline-none border border-white/15 focus:border-purple-500/60 transition-colors"
                />
              </form>
            </div>
            <div className="px-4 space-y-1">
              {SUGGESTIONS.slice(0, 8).map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onMouseDown={() => { handleSuggestion(s); setMobileSearch(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/8 transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-white/30" />
                  <span className="text-white/80 text-sm">{s}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}