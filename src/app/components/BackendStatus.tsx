import { useState, useEffect } from "react";
import {
  checkBackendHealth,
  fetchModelInfo,
  BackendStatus,
  PythonHealthResponse,
  PythonModelInfo,
  PYTHON_API_URL,
} from "../../lib/apiService";
import {
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookOpen,
  Zap,
} from "lucide-react";

interface BackendStatusProps {
  onStatusChange?: (status: BackendStatus) => void;
}

export function BackendStatusBadge({ onStatusChange }: BackendStatusProps) {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<PythonHealthResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<PythonModelInfo | null>(null);
  const [expanded, setExpanded] = useState(false);

  const poll = async () => {
    const h = await checkBackendHealth();
    if (h) {
      setStatus("online");
      setHealth(h);
      onStatusChange?.("online");
      // Fetch model info once when online
      if (!modelInfo) {
        const info = await fetchModelInfo();
        setModelInfo(info);
      }
    } else {
      setStatus("offline");
      setHealth(null);
      onStatusChange?.("offline");
    }
  };

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 8000); // poll every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: {
      color: "border-yellow-500/30 bg-yellow-950/20",
      dot: "bg-yellow-400 animate-pulse",
      text: "text-yellow-300",
      label: "Checking Python backend…",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />,
    },
    online: {
      color: "border-green-500/30 bg-green-950/20",
      dot: "bg-green-400",
      text: "text-green-300",
      label: "Python FastAPI — Online",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
    },
    offline: {
      color: "border-red-500/30 bg-red-950/20",
      dot: "bg-red-400",
      text: "text-red-300",
      label: "Python offline — TypeScript ML active",
      icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className={`rounded-xl border overflow-hidden mb-4 ${cfg.color}`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-white/50" />
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {cfg.icon}
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-white/30" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/10 px-3 py-3 space-y-3">
          {status === "online" && health ? (
            <>
              {/* Health stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Backend", value: health.backend },
                  { label: "Model", value: health.model.split("(")[0].trim() },
                  { label: "Videos", value: health.total_videos },
                  { label: "Threshold", value: `${(health.strict_threshold * 100).toFixed(0)}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/5 rounded-lg px-2.5 py-2">
                    <p className="text-white/40 text-[10px]">{label}</p>
                    <p className="text-white text-xs font-medium truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Model info */}
              {modelInfo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-white/60 text-xs font-medium">ML Configuration</p>
                  </div>
                  <div className="bg-white/5 rounded-lg px-2.5 py-2 space-y-1">
                    {[
                      ["Algorithm", modelInfo.algorithm],
                      ["Library", `${modelInfo.library} · ${modelInfo.language}`],
                      ["Vocabulary", `${modelInfo.vocabulary_size.toLocaleString()} terms`],
                      ["N-grams", `${modelInfo.ngram_range[0]}–${modelInfo.ngram_range[1]}`],
                      ["Max Features", modelInfo.max_features.toLocaleString()],
                      ["Tag Weight", `×${modelInfo.tag_weight}`],
                      ["Category Weight", `×${modelInfo.category_weight}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-white/40 text-[10px]">{k}</span>
                        <span className="text-white/80 text-[10px] font-mono">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sample vocab */}
                  {modelInfo.sample_vocabulary.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        <p className="text-white/50 text-[10px]">Sample Vocabulary (top 15)</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {modelInfo.sample_vocabulary.slice(0, 15).map((term) => (
                          <span
                            key={term}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/20"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : status === "offline" ? (
            <>
              <div className="bg-red-900/20 rounded-lg p-2.5 border border-red-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  <p className="text-red-300 text-xs font-medium">Start the Python backend</p>
                </div>
                <div className="bg-black/40 rounded-lg p-2 font-mono text-[10px] text-green-300 space-y-0.5">
                  <p className="text-white/40"># FocusTube backend:</p>
                  <p>cd backend</p>
                  <p>pip install -r requirements.txt</p>
                  <p>uvicorn main:app --reload --port 8000</p>
                </div>
                <p className="text-white/40 text-[10px] mt-1.5">
                  Listening on: <span className="text-white/60 font-mono">{PYTHON_API_URL}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
                <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
                <p className="text-yellow-300/80 text-[10px]">
                  TypeScript ML v2 active — Tag Jaccard + Category Enforcement running locally!
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}