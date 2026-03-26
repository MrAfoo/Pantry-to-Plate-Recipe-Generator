"use client";

import { useState } from "react";
import type { Recipe } from "../api/generate/route";
import RecipeRating from "./RecipeRating";
import type { Substitute } from "../api/substitute/route";

// ---------------------------------------------------------------------------
// Ingredient Substitution Popover
// ---------------------------------------------------------------------------
function SubstitutePopover({
  ingredient,
  recipeTitle,
  onClose,
}: {
  ingredient: string;
  recipeTitle: string;
  onClose: () => void;
}) {
  const [subs, setSubs]       = useState<Substitute[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Fetch on mount
  useState(() => {
    fetch("/api/substitute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient, recipeTitle }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSubs(d.substitutes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-sm p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              Substitutes for
            </h3>
            <p className="text-brand-600 dark:text-brand-400 font-bold text-base mt-0.5">
              {ingredient}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition text-xs"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <svg className="animate-spin w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-xs text-gray-400">Finding substitutes…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-500 dark:text-rose-400 text-center py-4">{error}</p>
        )}

        {/* Substitutes */}
        {subs && (
          <div className="space-y-3">
            {subs.map((s, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                    {s.ratio}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.reason}</p>
              </div>
            ))}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pt-1">
              Tap outside to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tag badge config
// ---------------------------------------------------------------------------
const TAG_CONFIG = {
  common: {
    label: "Everyday",
    emoji: "🥄",
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-700 dark:text-sky-300",
  },
  good: {
    label: "Impressive",
    emoji: "⭐",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-700 dark:text-violet-300",
  },
  special: {
    label: "Chef's Special",
    emoji: "👨‍🍳",
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-300",
  },
};

// ---------------------------------------------------------------------------
// Card colour themes
// ---------------------------------------------------------------------------
const THEMES = [
  {
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-500",
    accent: "text-orange-600 dark:text-orange-400",
    header: "bg-orange-50 dark:bg-orange-950/30",
    stepBg: "bg-orange-100 dark:bg-orange-900/40",
    stepText: "text-orange-700 dark:text-orange-300",
    divider: "border-orange-100 dark:border-orange-900/40",
    nutritionBg: "bg-orange-50 dark:bg-orange-950/20",
  },
  {
    border: "border-violet-200 dark:border-violet-800",
    badge: "bg-violet-500",
    accent: "text-violet-600 dark:text-violet-400",
    header: "bg-violet-50 dark:bg-violet-950/30",
    stepBg: "bg-violet-100 dark:bg-violet-900/40",
    stepText: "text-violet-700 dark:text-violet-300",
    divider: "border-violet-100 dark:border-violet-900/40",
    nutritionBg: "bg-violet-50 dark:bg-violet-950/20",
  },
  {
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-500",
    accent: "text-amber-600 dark:text-amber-400",
    header: "bg-amber-50 dark:bg-amber-950/30",
    stepBg: "bg-amber-100 dark:bg-amber-900/40",
    stepText: "text-amber-700 dark:text-amber-300",
    divider: "border-amber-100 dark:border-amber-900/40",
    nutritionBg: "bg-amber-50 dark:bg-amber-950/20",
  },
];

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------
async function exportToPDF(recipe: Recipe) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210, MARGIN = 20, CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 20;

  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, PAGE_W, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text("PANTRY TO PLATE  ·  AI Recipe", MARGIN, 9);
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, 9, { align: "right" });
  y = 26;

  // Tag label
  const tagCfg = TAG_CONFIG[recipe.tag] ?? TAG_CONFIG.common;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
  doc.text(tagCfg.label.toUpperCase(), MARGIN, y); y += 6;

  doc.setTextColor(30, 30, 30); doc.setFontSize(22); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(recipe.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y); y += titleLines.length * 9 + 4;

  // Nutrition bar
  doc.setFillColor(255, 247, 237);
  doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(249, 115, 22);
  const nutrition = recipe.nutrition;
  const nutText = `Prep: ${nutrition.prepTime}   Calories: ${nutrition.calories}   Protein: ${nutrition.protein}   Carbs: ${nutrition.carbs}   Fat: ${nutrition.fat}`;
  doc.text(nutText, MARGIN + 3, y + 8); y += 18;

  doc.setDrawColor(249, 115, 22); doc.setLineWidth(0.8);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y); y += 8;

  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(249, 115, 22);
  doc.text("INGREDIENTS", MARGIN, y); y += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
  for (const ing of recipe.ingredients) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(`• ${ing}`, MARGIN + 3, y); y += 5.5;
  }
  y += 5;

  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(249, 115, 22);
  doc.text("INSTRUCTIONS", MARGIN, y); y += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
  recipe.steps.forEach((step, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(`${i + 1}. ${step}`, CONTENT_W - 4) as string[];
    doc.text(lines, MARGIN + 3, y); y += lines.length * 5.5 + 2;
  });

  if (recipe.tip) {
    y += 4;
    doc.setFillColor(255, 251, 235);
    const tipLines = doc.splitTextToSize(`Chef's Tip: ${recipe.tip}`, CONTENT_W - 8) as string[];
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, tipLines.length * 5.5 + 8, 2, 2, "F");
    doc.setFontSize(9); doc.setTextColor(180, 100, 0);
    doc.text(tipLines, MARGIN + 4, y + 1); y += tipLines.length * 5.5 + 8;
  }

  doc.setFontSize(8); doc.setTextColor(160, 160, 160);
  doc.text("Generated by Pantry to Plate · Powered by Groq & Llama 4 Vision", PAGE_W / 2, 290, { align: "center" });
  doc.save(`${recipe.title.replace(/\s+/g, "_")}.pdf`);
}

// ---------------------------------------------------------------------------
// Share — encodes full recipe into URL hash
// ---------------------------------------------------------------------------
function buildShareUrl(recipe: Recipe): string {
  const payload = btoa(encodeURIComponent(JSON.stringify(recipe)));
  const params = new URLSearchParams({
    title: recipe.title,
    tag: recipe.tag ?? "special",
    ...(recipe.nutrition?.calories ? { calories: recipe.nutrition.calories } : {}),
    ...(recipe.nutrition?.prepTime ? { prepTime: recipe.nutrition.prepTime } : {}),
  });
  return `${window.location.origin}/recipe/share?${params.toString()}#recipe=${payload}`;
}
async function copyShareLink(recipe: Recipe, onCopied: () => void) {
  const url = buildShareUrl(recipe);
  try { await navigator.clipboard.writeText(url); onCopied(); }
  catch { prompt("Copy this link:", url); }
}

// ---------------------------------------------------------------------------
// Nutrition strip
// ---------------------------------------------------------------------------
function NutritionStrip({ recipe, nutritionBg, accent }: { recipe: Recipe; nutritionBg: string; accent: string }) {
  const n = recipe.nutrition;
  const items = [
    { icon: "⏱", label: "Prep", value: n.prepTime },
    { icon: "🔥", label: "Calories", value: n.calories },
    { icon: "💪", label: "Protein", value: n.protein },
    { icon: "🍞", label: "Carbs", value: n.carbs },
    { icon: "🥑", label: "Fat", value: n.fat },
  ];
  return (
    <div className={`${nutritionBg} rounded-xl p-3 border border-gray-100 dark:border-gray-700/50`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${accent} mb-2`}>Nutrition per serving</p>
      <div className="grid grid-cols-5 gap-1">
        {items.map(({ icon, label, value }) => (
          <div key={label} className="flex flex-col items-center text-center gap-0.5">
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{value}</span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecipeCard
// ---------------------------------------------------------------------------
export default function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [substituteFor, setSubstituteFor] = useState<string | null>(null);
  const c = THEMES[index % THEMES.length];
  const tagCfg = TAG_CONFIG[recipe.tag] ?? TAG_CONFIG.common;

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportToPDF(recipe); } finally { setExporting(false); }
  };

  const handleShare = () => {
    copyShareLink(recipe, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      className={`glass-card rounded-2xl border ${c.border} overflow-hidden animate-slide-up flex flex-col`}
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className={`${c.header} px-5 py-4 flex items-start gap-3`}>
        <div className="flex-1 min-w-0">
          {/* Tier badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tagCfg.bg} ${tagCfg.text} mb-2`}>
            {tagCfg.emoji} {tagCfg.label}
          </span>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
            {recipe.title}
          </h3>
        </div>
        <span className={`${c.badge} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
          {index + 1}
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4 flex-1">
        {/* Nutrition strip */}
        {recipe.nutrition && (
          <NutritionStrip recipe={recipe} nutritionBg={c.nutritionBg} accent={c.accent} />
        )}

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${c.accent}`}>
              Ingredients
            </h4>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Tap any ingredient to substitute</span>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                onClick={() => setSubstituteFor(ing)}
                className="flex items-center gap-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm cursor-pointer hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:scale-[1.03] transition-all duration-150"
                title={`Find substitutes for ${ing}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${c.badge} flex items-center justify-center flex-shrink-0 text-white`}>
                  <CheckIcon />
                </span>
                {ing}
                <span className="text-gray-300 dark:text-gray-500 text-[10px]">↔</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Substitution popover */}
        {substituteFor && (
          <SubstitutePopover
            ingredient={substituteFor}
            recipeTitle={recipe.title}
            onClose={() => setSubstituteFor(null)}
          />
        )}

        {/* Steps */}
        <div>
          <h4 className={`text-[10px] font-bold uppercase tracking-widest ${c.accent} mb-2`}>
            Instructions
          </h4>
          <ol className="space-y-2.5">
            {(expanded ? recipe.steps : recipe.steps.slice(0, 3)).map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full ${c.stepBg} ${c.stepText} flex items-center justify-center text-xs font-bold`}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {recipe.steps.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`mt-3 text-xs font-semibold ${c.accent} hover:underline underline-offset-2 transition`}
            >
              {expanded ? "▲ Show less" : `▼ Show ${recipe.steps.length - 3} more step${recipe.steps.length - 3 > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {/* Chef's tip */}
        {recipe.tip && (
          <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-bold">Chef&apos;s tip: </span>{recipe.tip}
            </p>
          </div>
        )}
      </div>

      {/* Rating widget */}
      <div className="px-5 pb-2">
        <RecipeRating recipeTitle={recipe.title} />
      </div>

      {/* Action buttons */}
      <div className={`px-5 pb-4 pt-3 flex gap-2 border-t ${c.divider}`}>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl border transition-all duration-200 ${
            exporting
              ? "bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed"
              : `${c.badge} text-white border-transparent hover:opacity-90 hover:scale-[1.02] shadow-sm`
          }`}
        >
          <DownloadIcon />
          {exporting ? "Exporting…" : "Save PDF"}
        </button>
        <button
          onClick={handleShare}
          title="Copies a link to this recipe to your clipboard"
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all duration-200 ${
            copied
              ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
              : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 hover:scale-[1.02]"
          }`}
        >
          <ShareIcon />
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </div>
  );
}
