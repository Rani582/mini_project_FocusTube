import { useState, useCallback, ReactNode } from "react";
import {
  FocusSession,
  FocusCategory,
  FocusSessionContext,
  DEFAULT_SESSION,
  CATEGORY_EMOJI,
} from "../../lib/focusSession";

export function FocusSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<FocusSession>(DEFAULT_SESSION);

  const startSession = useCallback((topic: FocusCategory) => {
    setSession((prev) => ({
      ...prev,
      isActive:         true,
      topic,
      topicEmoji:       topic ? (CATEGORY_EMOJI[topic] ?? "🎯") : "🎯",
      startTime:        new Date(),
      videosWatched:    0,
      onTopicCount:     0,
      offTopicAttempts: 0,
      currentStreak:    0,
      bestStreak:       0,
    }));
  }, []);

  const endSession = useCallback(() => {
    setSession(DEFAULT_SESSION);
  }, []);

  const recordVideoWatch = useCallback((onTopic: boolean) => {
    setSession((prev) => {
      const newStreak    = onTopic ? prev.currentStreak + 1 : 0;
      const bestStreak   = Math.max(prev.bestStreak, newStreak);
      return {
        ...prev,
        videosWatched: prev.videosWatched + 1,
        onTopicCount:  onTopic ? prev.onTopicCount + 1 : prev.onTopicCount,
        currentStreak: newStreak,
        bestStreak,
      };
    });
  }, []);

  const recordOffTopicAttempt = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      offTopicAttempts: prev.offTopicAttempts + 1,
    }));
  }, []);
  
  const toggleStrictMode = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      strictMode: !prev.strictMode,
    }));
  }, []);

  return (
    <FocusSessionContext.Provider
      value={{ session, startSession, endSession, recordVideoWatch, recordOffTopicAttempt, toggleStrictMode }}
    >
      {children}
    </FocusSessionContext.Provider>
  );
}
