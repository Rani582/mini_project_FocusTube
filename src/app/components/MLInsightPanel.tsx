import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ModelInsight, STRICT_THRESHOLD } from "../../lib/mlRecommendationModel";
import {
  Brain, ChevronDown, ChevronUp, Shield, ShieldOff,
  Info, Zap, Server, Code2, Tag, Layers,
  CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";

interface MLInsightPanelProps {
  insight: ModelInsight;
  strictMode: boolean;
  onToggleStrict: () => void;
  fromBackend?: boolean;
}

export function MLInsightPanel({
  insight,
  strictMode,
  onToggleStrict,
  fromBackend = false,
}: MLInsightPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const catBlockedCount     = insight.categoryBlockedCount ?? 0;
  const simBlockedCount     = insight.blockedCount - catBlockedCount;

  return (
    <div className="rounded-2xl border border-purple-500/25 overflow-hidden"
      style={{ background: "linear-gradient(160deg, rgba(88,28,135,0.15) 0%, rgba(15,15,15,0.9) 100%)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-purple-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/25 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-purple-300" />
          </div>
          <div>
            <p className="text-white text-xs" style={{ fontWeight: 600 }}>FocusTube ML Engine</p>
            <p className="text-purple-300/60 text-[10px]">TF-IDF · Cosine · Tag Jaccard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Source badge */}
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            fromBackend
              ? "bg-green-900/30 text-green-300 border-green-500/25"
              : "bg-blue-900/30 text-blue-300 border-blue-500/25"
          }`}>
            {fromBackend
              ? <><Server className="w-2.5 h-2.5" /> Python</>
              : <><Code2 className="w-2.5 h-2.5" /> TypeScript</>
            }
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {/* ── Strict Mode Toggle ── */}
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ scale: strictMode ? 1 : 0.85, opacity: strictMode ? 1 : 0.6 }}
          >
            {strictMode
              ? <Shield className="w-4.5 h-4.5 text-green-400" />
              : <ShieldOff className="w-4.5 h-4.5 text-orange-400" />
            }
          </motion.div>
          <div>
            <p className="text-white text-xs" style={{ fontWeight: 600 }}>
              {strictMode ? "Stay On Topic — STRICT" : "Relaxed Mode"}
            </p>
            <p className="text-white/35 text-[10px]">
              {strictMode
                ? "Category enforced + tag similarity filter"
                : "All videos ranked by cosine similarity"
              }
            </p>
          </div>
        </div>
        {/* iOS-style toggle */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onToggleStrict}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
            strictMode ? "bg-green-500" : "bg-white/20"
          }`}
        >
          <motion.span
            animate={{ x: strictMode ? 21 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
          />
        </motion.button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 divide-x divide-white/6 border-b border-white/6">
        <div className="px-2 py-2.5 text-center">
          <p className="text-green-400 text-base" style={{ fontWeight: 700 }}>{insight.allowedCount}</p>
          <p className="text-white/35 text-[10px]">On-Topic</p>
        </div>
        <div className="px-2 py-2.5 text-center">
          <p className={`text-base ${strictMode ? "text-red-400" : "text-white/30"}`} style={{ fontWeight: 700 }}>
            {insight.blockedCount}
          </p>
          <p className="text-white/35 text-[10px]">
            {strictMode ? "Blocked" : "Low Match"}
          </p>
        </div>
        <div className="px-2 py-2.5 text-center">
          <p className="text-purple-400 text-base" style={{ fontWeight: 700 }}>
            {Math.round(STRICT_THRESHOLD * 100)}%
          </p>
          <p className="text-white/35 text-[10px]">Threshold</p>
        </div>
      </div>

      {/* ── Current video category pill ── */}
      {insight.queryCategory && (
        <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-white/6">
          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <p className="text-white/50 text-xs">Watching:</p>
          <span className="px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-200 border border-purple-500/25 text-[11px]" style={{ fontWeight: 600 }}>
            {insight.queryCategory}
          </span>
          {strictMode && (
            <span className="text-white/30 text-[10px]">· only this category shown</span>
          )}
        </div>
      )}

      {/* ── Strict Mode Gate Summary ── */}
      {strictMode && (insight.blockedCount > 0) && (
        <div className="px-3.5 py-2.5 space-y-1.5 border-b border-white/6">
          {catBlockedCount > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-red-300/70 text-[11px]">
                <span style={{ fontWeight: 600 }}>{catBlockedCount} videos</span> blocked — wrong category
              </p>
            </div>
          )}
          {simBlockedCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <p className="text-orange-300/70 text-[11px]">
                <span style={{ fontWeight: 600 }}>{simBlockedCount} videos</span> blocked — low tag similarity
              </p>
            </div>
          )}
          {insight.allowedCount > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <p className="text-green-300/70 text-[11px]">
                <span style={{ fontWeight: 600 }}>{insight.allowedCount} videos</span> passed both gates
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Current video tags ── */}
      {insight.queryTags && insight.queryTags.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-white/6">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Tag className="w-3 h-3 text-yellow-400" />
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Current Video Tags</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {insight.queryTags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-900/25 text-yellow-300/80 border border-yellow-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Expandable details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 py-3 space-y-3 border-t border-white/6">

              {/* Algorithm explanation */}
              <div className="rounded-xl p-3 border border-purple-500/15"
                style={{ background: "rgba(88,28,135,0.15)" }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="w-3.5 h-3.5 text-purple-300" />
                  <p className="text-purple-200 text-xs" style={{ fontWeight: 600 }}>
                    {strictMode ? "Strict Mode — 2 Gate Algorithm" : "Relaxed Mode Algorithm"}
                  </p>
                </div>
                {strictMode ? (
                  <ol className="space-y-2">
                    {[
                      { step: "Gate 1 — Category", desc: `Must match "${insight.queryCategory}" — all other categories blocked immediately`, color: "text-red-300", num: "bg-red-600/40 text-red-200" },
                      { step: "Gate 2 — Combined Score", desc: `combined = 0.55 × cosine_sim + 0.45 × tag_jaccard ≥ ${Math.round(STRICT_THRESHOLD * 100)}%`, color: "text-orange-300", num: "bg-orange-600/40 text-orange-200" },
                      { step: "Tag Jaccard", desc: "Measures direct tag overlap between videos — exact match + partial word match", color: "text-yellow-300", num: "bg-yellow-600/40 text-yellow-200" },
                      { step: "Rank & Show", desc: "Passing videos ranked by combined score descending", color: "text-green-300", num: "bg-green-600/40 text-green-200" },
                    ].map(({ step, desc, color, num }, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full ${num} flex items-center justify-center text-[9px] font-bold mt-0.5`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className={`text-[11px] font-medium ${color}`}>{step}</p>
                          <p className="text-white/40 text-[10px] leading-relaxed">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ol className="space-y-1.5">
                    {[
                      "Build TF-IDF vectors (category×6, tags×5, title×2, desc×1)",
                      "Compute cosine similarity to all 39 other videos",
                      "Sort by score descending — no filtering applied",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="shrink-0 w-4 h-4 rounded-full bg-purple-600/40 text-purple-300 flex items-center justify-center text-[9px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-white/50 text-[10px] leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Top TF-IDF terms */}
              {insight.queryTerms.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <p className="text-white/60 text-[11px]" style={{ fontWeight: 500 }}>
                      Top TF-IDF Fingerprint
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {insight.queryTerms.slice(0, 12).map((term) => (
                      <span
                        key={term}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600/25 text-purple-200 border border-purple-500/20"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Threshold visual */}
              <div>
                <p className="text-white/40 text-[10px] mb-2">
                  {strictMode
                    ? `Combined score threshold: ${Math.round(STRICT_THRESHOLD * 100)}% (Gate 2)`
                    : "Similarity spectrum (relaxed — no threshold)"}
                </p>
                <div className="relative h-3 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: "100%",
                      background: "linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 70%, #3b82f6 100%)",
                    }}
                  />
                  {strictMode && (
                    <>
                      {/* Blocked zone */}
                      <div
                        className="absolute inset-y-0 left-0 bg-black/50 rounded-l-full"
                        style={{ width: `${STRICT_THRESHOLD * 100}%` }}
                      />
                      {/* Threshold needle */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                        style={{ left: `${STRICT_THRESHOLD * 100}%` }}
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-white/25 mt-1">
                  <span>0% (unrelated)</span>
                  {strictMode && (
                    <span className="text-white/50" style={{ marginLeft: `${STRICT_THRESHOLD * 100 - 10}%` }}>
                      {Math.round(STRICT_THRESHOLD * 100)}% cutoff
                    </span>
                  )}
                  <span>100% (identical)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
