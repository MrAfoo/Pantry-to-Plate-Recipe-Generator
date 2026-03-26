"use client";

import { useEffect, useState } from "react";
import type { Recipe } from "../api/generate/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface HistoryEntry {
  id: string;
  timestamp: number;
  previews: string[];
  recipes: Recipe[];
}

const STORAGE_KEY = "pantry_to_plate_history";
const MAX_ENTRIES = 20;

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}
export function addHistoryEntry(entry: HistoryEntry) {
  const updated = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  saveHistory(updated);
  return updated;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
  refreshKey: number;
}

export default function HistorySidebar({ isOpen, onClose, onRestore, refreshKey }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => { setEntries(loadHistory()); }, [isOpen, refreshKey]);

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveHistory(updated);
  };

  const handleClearAll = () => { setEntries([]); saveHistory([]); };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside className={`
        fixed top-0 right-0 h-full w-80 z-50 flex flex-col
        bg-white dark:bg-gray-900
        border-l border-gray-100 dark:border-gray-700
        shadow-2xl transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-brand-500 dark:bg-gray-800">
          <div>
            <h2 className="font-bold text-white text-base">Generation History</h2>
            <p className="text-xs text-brand-100 dark:text-gray-400 mt-0.5">
              {entries.length} saved session{entries.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 dark:bg-gray-700 shadow flex items-center justify-center text-white dark:text-gray-300 hover:bg-white/30 dark:hover:text-white hover:scale-105 transition"
          >
            ✕
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
              <span className="text-5xl">🕐</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">No history yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed max-w-[200px]">
                Your past recipe generations will appear here.
              </p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all duration-200 overflow-hidden"
              >
                {/* Thumbnails */}
                <div className="flex gap-1 p-2 bg-gray-50 dark:bg-gray-700/50">
                  {entry.previews.slice(0, 3).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt={`Preview ${i + 1}`}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0"
                    />
                  ))}
                  {entry.previews.length > 3 && (
                    <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-semibold flex-shrink-0">
                      +{entry.previews.length - 3}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">{formatDate(entry.timestamp)}</p>
                  <ul className="space-y-0.5">
                    {entry.recipes.map((r, i) => (
                      <li key={i} className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate flex items-center gap-1.5">
                        <span className="text-brand-400">▸</span> {r.title}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-3 pb-3">
                  <button
                    onClick={() => { onRestore(entry); onClose(); }}
                    className="flex-1 text-xs font-semibold bg-brand-500 text-white py-1.5 rounded-lg hover:bg-brand-600 transition"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs font-semibold text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleClearAll}
              className="w-full text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 transition py-1"
            >
              Clear all history
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
