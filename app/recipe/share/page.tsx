import type { Metadata } from "next";
import type { Recipe } from "../../api/generate/route";

// ---------------------------------------------------------------------------
// Dynamic OG metadata — runs server-side, reads search params from URL
// Works perfectly in page.tsx (unlike layout.tsx in Next.js 15)
// ---------------------------------------------------------------------------
export async function generateMetadata(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const searchParams = await props.searchParams;

  const raw = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? decodeURIComponent(v) : undefined;
  };

  const title    = raw("title")    ?? "AI-Generated Recipe";
  const tag      = raw("tag")      ?? "special";
  const calories = raw("calories") ?? null;
  const prepTime = raw("prepTime") ?? null;

  const tagLabel =
    tag === "common" ? "🥄 Everyday Recipe" :
    tag === "good"   ? "⭐ Impressive Recipe" :
                       "👨‍🍳 Chef's Special";

  const description = [
    tagLabel,
    calories ? `${calories}` : null,
    prepTime ? `Ready in ${prepTime}` : null,
    "Made with ingredients from your fridge · Pantry to Plate AI Chef",
  ].filter(Boolean).join(" · ");

  const ogImageUrl =
    `/api/og?title=${encodeURIComponent(title)}&tag=${tag}` +
    (calories ? `&calories=${encodeURIComponent(calories)}` : "") +
    (prepTime ? `&prepTime=${encodeURIComponent(prepTime)}` : "");

  return {
    title: `${title} — Pantry to Plate`,
    description,
    openGraph: {
      title: `${title} — Pantry to Plate`,
      description,
      type: "article",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Pantry to Plate`,
      description,
      images: [ogImageUrl],
    },
  };
}

// ---------------------------------------------------------------------------
// Client component for the interactive recipe share page
// ---------------------------------------------------------------------------
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RecipeRating from "../../components/RecipeRating";

// ---------------------------------------------------------------------------
// Tag config
// ---------------------------------------------------------------------------
const TAG_CONFIG = {
  common:  { label: "Everyday",       emoji: "🥄", bg: "bg-sky-100 dark:bg-sky-900/40",    text: "text-sky-700 dark:text-sky-300"    },
  good:    { label: "Impressive",     emoji: "⭐",  bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  special: { label: "Chef's Special", emoji: "👨‍🍳", bg: "bg-amber-100 dark:bg-amber-900/40",  text: "text-amber-700 dark:text-amber-300"  },
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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
function PrintIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
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

// ---------------------------------------------------------------------------
// Decode recipe from URL hash  #recipe=<base64>
// ---------------------------------------------------------------------------
function decodeRecipeFromHash(): Recipe | null {
  try {
    const hash = window.location.hash;
    const match = hash.match(/[#&]recipe=([^&]+)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(atob(match[1]))) as Recipe;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------
async function exportToPDF(recipe: Recipe) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210, MARGIN = 20, CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 20;

  doc.setFillColor(249, 115, 22); doc.rect(0, 0, PAGE_W, 14, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text("PANTRY TO PLATE  ·  AI Recipe", MARGIN, 9);
  doc.text(new Date().toLocaleDateString(), PAGE_W - MARGIN, 9, { align: "right" });
  y = 26;

  const tagCfg = TAG_CONFIG[recipe.tag] ?? TAG_CONFIG.special;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
  doc.text(`${tagCfg.emoji}  ${tagCfg.label.toUpperCase()}`, MARGIN, y); y += 6;

  doc.setTextColor(30, 30, 30); doc.setFontSize(22); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(recipe.title, CONTENT_W) as string[];
  doc.text(titleLines, MARGIN, y); y += titleLines.length * 9 + 4;

  if (recipe.nutrition) {
    const n = recipe.nutrition;
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(249, 115, 22);
    doc.text(`⏱ ${n.prepTime}   🔥 ${n.calories}   💪 ${n.protein} protein   🍞 ${n.carbs} carbs   🥑 ${n.fat} fat`, MARGIN + 3, y + 8);
    y += 18;
  }

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
    const tipLines = doc.splitTextToSize(`💡 Chef's Tip: ${recipe.tip}`, CONTENT_W - 8) as string[];
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, tipLines.length * 5.5 + 8, 2, 2, "F");
    doc.setFontSize(9); doc.setTextColor(180, 100, 0);
    doc.text(tipLines, MARGIN + 4, y + 1);
  }

  doc.setFontSize(8); doc.setTextColor(160, 160, 160);
  doc.text("Generated by Pantry to Plate · Powered by Groq & Llama 4 Vision", PAGE_W / 2, 290, { align: "center" });
  doc.save(`${recipe.title.replace(/\s+/g, "_")}.pdf`);
}

// ---------------------------------------------------------------------------
// Nutrition strip
// ---------------------------------------------------------------------------
function NutritionStrip({ recipe }: { recipe: Recipe }) {
  if (!recipe.nutrition) return null;
  const n = recipe.nutrition;
  const items = [
    { icon: "⏱", label: "Prep",     value: n.prepTime },
    { icon: "🔥", label: "Calories", value: n.calories },
    { icon: "💪", label: "Protein",  value: n.protein  },
    { icon: "🍞", label: "Carbs",    value: n.carbs    },
    { icon: "🥑", label: "Fat",      value: n.fat      },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map(({ icon, label, value }) => (
        <div key={label} className="flex flex-col items-center text-center bg-orange-50 dark:bg-orange-950/20 rounded-xl py-3 px-1 border border-orange-100 dark:border-orange-900/30">
          <span className="text-2xl mb-1">{icon}</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{value}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RecipeSharePage() {
  const [recipe, setRecipe]   = useState<Recipe | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [today] = useState(() =>
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  );

  useEffect(() => {
    const decoded = decodeRecipeFromHash();
    if (decoded) setRecipe(decoded);
    else setNotFound(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { prompt("Copy this link:", window.location.href); }
  };

  const handleExport = async () => {
    if (!recipe) return;
    setExporting(true);
    try { await exportToPDF(recipe); } finally { setExporting(false); }
  };

  // Loading
  if (!recipe && !notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">Loading recipe…</p>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-6">🍽️</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Recipe not found</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            This share link is invalid or corrupted. The recipe data could not be decoded.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-amber-500 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
            <ArrowLeftIcon /> Go back home
          </Link>
        </div>
      </div>
    );
  }

  const tagCfg = TAG_CONFIG[recipe!.tag] ?? TAG_CONFIG.special;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-orange-100 dark:border-gray-700 shadow-sm no-print">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 transition font-semibold text-sm">
            <ArrowLeftIcon /> Back to Pantry to Plate
          </Link>
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block font-medium">
            🍽️ Pantry to Plate
          </span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Print-only header */}
        <div className="print-header hidden">
          <span className="print-header-logo">🍽️ Pantry to Plate</span>
          <span className="print-header-date">Printed on {today}</span>
        </div>

        {/* Hero */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${tagCfg.bg} ${tagCfg.text}`}>
              {tagCfg.emoji} {tagCfg.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Shared via Pantry to Plate</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-4">
            {recipe!.title}
          </h1>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 no-print">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full shadow-md transition-all duration-200
                ${exporting ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-brand-500 to-amber-500 text-white hover:shadow-lg hover:scale-105"}`}
            >
              <DownloadIcon /> {exporting ? "Exporting…" : "Download PDF"}
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full border transition-all duration-200
                ${copied
                  ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-300 hover:scale-105"}`}
            >
              <ShareIcon /> {copied ? "Link copied!" : "Copy share link"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-brand-300 hover:scale-105 transition-all duration-200"
            >
              <PrintIcon /> Print recipe
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mb-8" />

        {/* Nutrition */}
        {recipe!.nutrition && (
          <section className="mb-8 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400 mb-4">Nutrition per serving</h2>
            <NutritionStrip recipe={recipe!} />
          </section>
        )}

        {/* Ingredients */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400 mb-4">Ingredients</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recipe!.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 text-white">
                  <CheckIcon />
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{ing}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Instructions */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400 mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe!.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{step}</p>
                  {i < recipe!.steps.length - 1 && <div className="mt-4 border-b border-gray-100 dark:border-gray-800" />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Chef's tip */}
        {recipe!.tip && (
          <section className="mb-8 animate-slide-up" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
            <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-5 py-4">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Chef&apos;s Tip</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{recipe!.tip}</p>
              </div>
            </div>
          </section>
        )}

        {/* Rating */}
        <section className="mb-8 animate-slide-up no-print" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
          <RecipeRating recipeTitle={recipe!.title} />
        </section>

        {/* Footer CTA */}
        <div className="text-center pt-6 border-t border-gray-100 dark:border-gray-800 no-print">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Want recipes from your own fridge?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-amber-500 text-white font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            📷 Try Pantry to Plate
          </Link>
        </div>
      </main>

      <footer className="mt-16 py-6 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600 no-print">
        Pantry to Plate · Powered by Groq & Llama 4 Vision · Built with Next.js
      </footer>
    </div>
  );
}
