/**
 * focusSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FocusTube focus session state — tracks user's declared viewing intent,
 * session duration, on-topic streak, and focus score.
 *
 * The goal: help users who get distracted honour their original intention.
 */

import { createContext, useContext } from "react";

export type FocusCategory =
  | "Machine Learning"
  | "Web Development"
  | "Cooking"
  | "Gaming"
  | "Fitness"
  | "Music"
  | "Travel"
  | "Science"
  | null;

export interface FocusSession {
  isActive: boolean;
  topic: FocusCategory;
  topicEmoji: string;
  startTime: Date | null;
  videosWatched: number;
  onTopicCount: number;          // videos watched within the focus topic
  offTopicAttempts: number;      // times user tried to click off-topic
  currentStreak: number;         // consecutive on-topic videos
  bestStreak: number;
  strictMode: boolean;
}

export interface FocusSessionActions {
  startSession: (topic: FocusCategory) => void;
  endSession: () => void;
  recordVideoWatch: (onTopic: boolean) => void;
  recordOffTopicAttempt: () => void;
  toggleStrictMode: () => void;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  "Machine Learning": "🤖",
  "Web Development":  "💻",
  "Cooking":          "🍳",
  "Gaming":           "🎮",
  "Fitness":          "💪",
  "Music":            "🎵",
  "Travel":           "✈️",
  "Science":          "🔬",
};

export const CATEGORY_DESCRIPTION: Record<string, string> = {
  "Machine Learning": "AI, neural nets, data science",
  "Web Development":  "React, CSS, APIs, coding",
  "Cooking":          "Recipes, techniques, cuisine",
  "Gaming":           "Games, walkthroughs, esports",
  "Fitness":          "Workouts, yoga, health",
  "Music":            "Guitar, piano, production",
  "Travel":           "Destinations, tips, adventures",
  "Science":          "Physics, biology, space",
};

export const CATEGORY_COLOR: Record<string, { from: string; to: string; text: string; border: string }> = {
  "Machine Learning": { from: "from-indigo-500/25",  to: "to-purple-600/25",  text: "text-indigo-300",  border: "border-indigo-500/30" },
  "Web Development":  { from: "from-blue-500/25",    to: "to-cyan-500/25",    text: "text-blue-300",    border: "border-blue-500/30"   },
  "Cooking":          { from: "from-orange-500/25",  to: "to-yellow-500/25",  text: "text-orange-300",  border: "border-orange-500/30" },
  "Gaming":           { from: "from-purple-500/25",  to: "to-pink-500/25",    text: "text-purple-300",  border: "border-purple-500/30" },
  "Fitness":          { from: "from-green-500/25",   to: "to-emerald-500/25", text: "text-green-300",   border: "border-green-500/30"  },
  "Music":            { from: "from-pink-500/25",    to: "to-rose-500/25",    text: "text-pink-300",    border: "border-pink-500/30"   },
  "Travel":           { from: "from-teal-500/25",    to: "to-cyan-500/25",    text: "text-teal-300",    border: "border-teal-500/30"   },
  "Science":          { from: "from-violet-500/25",  to: "to-blue-500/25",    text: "text-violet-300",  border: "border-violet-500/30" },
};

/** Compute focus score 0–100 from session stats */
export function computeFocusScore(session: FocusSession): number {
  if (session.videosWatched === 0) return 100;
  const onTopicRatio = session.onTopicCount / session.videosWatched;
  const streakBonus  = Math.min(session.currentStreak * 5, 20);
  const distractPenalty = Math.min(session.offTopicAttempts * 3, 20);
  return Math.max(0, Math.min(100, Math.round(onTopicRatio * 80 + streakBonus - distractPenalty)));
}

/** Format elapsed time since startTime */
export function formatDuration(startTime: Date | null): string {
  if (!startTime) return "0m";
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export const DEFAULT_SESSION: FocusSession = {
  isActive:           false,
  topic:              null,
  topicEmoji:         "",
  startTime:          null,
  videosWatched:      0,
  onTopicCount:       0,
  offTopicAttempts:   0,
  currentStreak:      0,
  bestStreak:         0,
  strictMode:         true,
};

export const FocusSessionContext = createContext<
  { session: FocusSession } & FocusSessionActions
>({
  session:               DEFAULT_SESSION,
  startSession:          () => {},
  endSession:            () => {},
  recordVideoWatch:      () => {},
  recordOffTopicAttempt: () => {},
  toggleStrictMode:      () => {},
});

export function useFocusSession() {
  return useContext(FocusSessionContext);
}
