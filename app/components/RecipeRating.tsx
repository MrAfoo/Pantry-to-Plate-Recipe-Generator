"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Vote = "good" | "bad" | null;

interface RatingData {
  good: number;
  bad: number;
}

// ---------------------------------------------------------------------------
// localStorage helpers — remember the user's vote per recipe title
// ---------------------------------------------------------------------------
const STORAGE_KEY = "ptp_recipe_votes";

function getSavedVote(title: string): Vote {
  try {
    const map = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return (map[title] as Vote) ?? null;
  } catch { return null; }
}

function saveVote(title: string, vote: Vote) {
  try {
    const map = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    map[title] = vote;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pct(val: number, total: number) {
  if (total === 0) return 0;
  return Math.round((val / total) * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  recipeTitle: string;
}

export default function RecipeRating({ recipeTitle }: Props) {
  const [data, setData]       = useState<RatingData | null>(null);
  const [vote, setVote]       = useState<Vote>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ---- Load current ratings + user's previous vote on mount ---------------
  useEffect(() => {
    const saved = getSavedVote(recipeTitle);
    setVote(saved);

    fetch(`/api/rate?title=${encodeURIComponent(recipeTitle)}`)
      .then((r) => r.json())
      .then((d) => setData({ good: d.good, bad: d.bad }))
      .catch(() => setError("Could not load ratings."))
      .finally(() => setLoading(false));
  }, [recipeTitle]);

  // ---- Submit a vote -------------------------------------------------------
  const handleVote = async (v: "good" | "bad") => {
    if (voting || vote !== null) return; // already voted
    setVoting(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: recipeTitle, vote: v }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData({ good: d.good, bad: d.bad });
      setVote(v);
      saveVote(recipeTitle, v);
    } catch {
      setError("Failed to submit vote. Please try again.");
    } finally {
      setVoting(false);
    }
  };

  const total = (data?.good ?? 0) + (data?.bad ?? 0);
  const goodPct = pct(data?.good ?? 0, total);
  const badPct  = pct(data?.bad  ?? 0, total);

  // ---- Render --------------------------------------------------------------
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            Rate this recipe
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {vote
              ? `You rated this recipe ${vote === "good" ? "👍 Good" : "👎 Not for me"}`
              : "Was this recipe helpful?"}
          </p>
        </div>
        {!loading && data && total > 0 && (
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2.5 py-1 rounded-full">
            {total} vote{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-500 dark:text-rose-400 mb-3">{error}</p>
      )}

      {/* Vote buttons */}
      <div className="flex gap-3 mb-4">
        {/* 👍 Good */}
        <button
          onClick={() => handleVote("good")}
          disabled={vote !== null || voting}
          className={`
            flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm
            border-2 transition-all duration-200
            ${vote === "good"
              ? "bg-green-500 border-green-500 text-white shadow-md scale-[1.02]"
              : vote === "bad"
                ? "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 dark:hover:text-green-400 hover:scale-[1.02]"
            }
            ${voting ? "opacity-60 cursor-wait" : ""}
          `}
        >
          <span className="text-xl leading-none">👍</span>
          <span>Good recipe</span>
          {data && vote !== null && (
            <span className="ml-auto text-xs font-bold opacity-80">{data.good}</span>
          )}
        </button>

        {/* 👎 Bad */}
        <button
          onClick={() => handleVote("bad")}
          disabled={vote !== null || voting}
          className={`
            flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm
            border-2 transition-all duration-200
            ${vote === "bad"
              ? "bg-rose-500 border-rose-500 text-white shadow-md scale-[1.02]"
              : vote === "good"
                ? "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 hover:scale-[1.02]"
            }
            ${voting ? "opacity-60 cursor-wait" : ""}
          `}
        >
          <span className="text-xl leading-none">👎</span>
          <span>Not for me</span>
          {data && vote !== null && (
            <span className="ml-auto text-xs font-bold opacity-80">{data.bad}</span>
          )}
        </button>
      </div>

      {/* Progress bar — shown after voting or if total > 0 */}
      {data && total > 0 && (
        <div className="space-y-2">
          {/* Good bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 w-10 text-right">
              {goodPct}%
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${goodPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 w-10">👍 {data.good}</span>
          </div>
          {/* Bad bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 w-10 text-right">
              {badPct}%
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-700"
                style={{ width: `${badPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 w-10">👎 {data.bad}</span>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-2 mt-1">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
