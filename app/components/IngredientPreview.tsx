"use client";

import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Ingredient chip
// ---------------------------------------------------------------------------
function IngredientChip({
  ingredient,
  onRemove,
  onEdit,
}: {
  ingredient: string;
  onRemove: (val: string) => void;
  onEdit: (old: string, newVal: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ingredient);

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== ingredient) {
      onEdit(ingredient, trimmed);
    } else {
      setDraft(ingredient); // revert
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/40 border border-brand-300 dark:border-brand-600 rounded-full px-2 py-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") { setDraft(ingredient); setEditing(false); }
          }}
          className="bg-transparent text-xs text-brand-700 dark:text-brand-300 outline-none w-28 font-medium"
        />
        <button
          onClick={commitEdit}
          className="text-green-500 hover:text-green-600 transition flex-shrink-0"
          aria-label="Confirm edit"
        >
          <CheckIcon />
        </button>
      </span>
    );
  }

  return (
    <span className="group flex items-center gap-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm hover:border-brand-300 dark:hover:border-brand-500 transition-all">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
      {ingredient}
      <span className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-brand-500 transition"
          aria-label={`Edit ${ingredient}`}
        >
          <PencilIcon />
        </button>
        <button
          onClick={() => onRemove(ingredient)}
          className="text-gray-400 hover:text-rose-500 transition"
          aria-label={`Remove ${ingredient}`}
        >
          <XIcon />
        </button>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  imagesBase64: string[];
  onConfirm: (ingredients: string[]) => void;
  onCancel: () => void;
}

export default function IngredientPreview({ imagesBase64, onConfirm, onCancel }: Props) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState("");
  const [addingNew, setAddingNew] = useState(false);

  // ---- Detect ingredients from images ------------------------------------
  const detect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/detect-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagesBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Detection failed.");
      setIngredients(data.ingredients as string[]);
      setDetected(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not detect ingredients.");
    } finally {
      setLoading(false);
    }
  }, [imagesBase64]);

  // Auto-detect on first mount
  useState(() => { detect(); });

  // ---- Handlers ----------------------------------------------------------
  const handleRemove = (val: string) =>
    setIngredients((prev) => prev.filter((i) => i !== val));

  const handleEdit = (old: string, newVal: string) =>
    setIngredients((prev) => prev.map((i) => (i === old ? newVal : i)));

  const handleAddNew = () => {
    const trimmed = newIngredient.trim();
    if (!trimmed) return;
    if (!ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
    }
    setNewIngredient("");
    setAddingNew(false);
  };

  const handleRedetect = () => {
    setDetected(false);
    setIngredients([]);
    detect();
  };

  // ---- Render ------------------------------------------------------------
  return (
    <div className="surface rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="bg-brand-500 dark:bg-gray-800 px-6 py-4 border-b border-brand-600 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            🔍 Detected Ingredients
          </h3>
          <p className="text-xs text-brand-100 dark:text-gray-400 mt-0.5">
            Review, edit, or add ingredients before generating recipes
          </p>
        </div>
        {detected && !loading && (
          <button
            onClick={handleRedetect}
            className="text-xs font-semibold text-white/80 hover:text-white underline underline-offset-2 flex-shrink-0 transition"
          >
            ↺ Re-scan
          </button>
        )}
      </div>

      <div className="px-6 py-5">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <SpinnerIcon />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Scanning your fridge for ingredients…
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Detection failed</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">{error}</p>
              <button
                onClick={detect}
                className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Ingredient chips */}
        {detected && !loading && (
          <>
            {ingredients.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No ingredients detected. Add some manually below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {ingredients.map((ing) => (
                  <IngredientChip
                    key={ing}
                    ingredient={ing}
                    onRemove={handleRemove}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}

            {/* Add ingredient */}
            <div className="mb-5">
              {addingNew ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddNew();
                      if (e.key === "Escape") { setAddingNew(false); setNewIngredient(""); }
                    }}
                    placeholder="e.g. fresh basil"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleAddNew}
                    className="px-3 py-2 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingNew(false); setNewIngredient(""); }}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingNew(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition"
                >
                  <PlusIcon /> Add an ingredient manually
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between mb-5 text-xs text-gray-400 dark:text-gray-500">
              <span>
                <strong className="text-gray-700 dark:text-gray-300">{ingredients.length}</strong> ingredient{ingredients.length !== 1 ? "s" : ""} confirmed
              </span>
              <span>Hover any chip to edit or remove</span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onConfirm(ingredients)}
                disabled={ingredients.length === 0}
                className={`
                  flex-1 flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-all duration-200
                  ${ingredients.length > 0
                    ? "bg-gradient-to-r from-brand-500 to-amber-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                🍳 Generate Recipes with These Ingredients
              </button>
              <button
                onClick={onCancel}
                className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
