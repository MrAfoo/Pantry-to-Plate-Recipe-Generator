"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import type { Recipe, GrocerySuggestion } from "./api/generate/route";
import RecipeCard from "./components/RecipeCard";
import HistorySidebar, {
  addHistoryEntry,
  loadHistory,
  type HistoryEntry,
} from "./components/HistorySidebar";
import IngredientPreview from "./components/IngredientPreview";
import ThemeToggle from "./components/ThemeToggle";
import DietaryFilters, { type DietaryPreference } from "./components/DietaryFilters";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_IMAGES = 10;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function ChefHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM5.25 6.75a3 3 0 10-1.06 5.814L5.25 21h13.5l1.06-8.436A3 3 0 1018.75 6.75a5.25 5.25 0 00-13.5 0z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-12 h-12 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Image preview item
// ---------------------------------------------------------------------------
interface ImageFile {
  id: string;
  base64: string;
  name: string;
  sizeMB: number;
}

function ImagePreviewItem({
  img,
  onRemove,
  disabled,
}: {
  img: ImageFile;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative group rounded-xl overflow-hidden border-2 border-white shadow-md w-24 h-24 flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
      {!disabled && (
        <button
          onClick={() => onRemove(img.id)}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          aria-label="Remove image"
        >
          <XIcon />
        </button>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
        {img.sizeMB.toFixed(1)} MB
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropzone area (multi-image)
// ---------------------------------------------------------------------------
function DropzoneArea({
  images,
  onImagesAdded,
  onRemove,
  isLoading,
  sizeErrors,
}: {
  images: ImageFile[];
  onImagesAdded: (files: File[]) => void;
  onRemove: (id: string) => void;
  isLoading: boolean;
  sizeErrors: string[];
}) {
  const canAddMore = images.length < MAX_IMAGES;

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onImagesAdded(accepted);
    },
    [onImagesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
    disabled: isLoading || !canAddMore,
    multiple: true,
  });

  return (
    <div className="space-y-3">
      {/* Drop target */}
      <div
        {...getRootProps()}
        className={`
          relative w-full rounded-2xl border-2 border-dashed transition-all duration-300
          ${canAddMore && !isLoading ? "cursor-pointer" : "cursor-not-allowed opacity-60"}
          ${isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20 scale-[1.01] shadow-lg shadow-brand-100"
            : canAddMore
              ? "border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/40 hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 hover:shadow-md"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
          {images.length === 0 ? (
            <>
              <div className={`p-4 rounded-full transition-colors ${isDragActive ? "bg-brand-100 dark:bg-brand-900/40" : "bg-gray-100 dark:bg-gray-700"}`}>
                <UploadIcon />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                  {isDragActive ? "Release to analyse your fridge!" : "Drag & drop fridge photos"}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  or <span className="text-brand-600 dark:text-brand-400 font-semibold underline underline-offset-2">browse files</span>
                  &nbsp;— max {MAX_IMAGES} images, max {MAX_FILE_SIZE_MB} MB each
                </p>
              </div>
            </>
          ) : canAddMore ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className={`p-3 rounded-full transition-colors ${isDragActive ? "bg-brand-100 dark:bg-brand-900/40" : "bg-gray-100 dark:bg-gray-700"}`}>
                <UploadIcon />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {isDragActive ? "Drop to add!" : `Add more photos (${images.length}/${MAX_IMAGES})`}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Max {MAX_FILE_SIZE_MB} MB per image</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
              Maximum {MAX_IMAGES} images reached
            </p>
          )}
        </div>
      </div>

      {/* Size error alerts */}
      {sizeErrors.length > 0 && (
        <div className="space-y-1.5">
          {sizeErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 animate-fade-in"
            >
              <span className="text-base flex-shrink-0">⚠️</span>
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {images.length} image{images.length > 1 ? "s" : ""} selected
            </p>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {images.length}/{MAX_IMAGES} slots used
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {images.map((img) => (
              <ImagePreviewItem
                key={img.id}
                img={img}
                onRemove={onRemove}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grocery suggestion card (with copy-to-clipboard)
// ---------------------------------------------------------------------------
function GroceryCard({ suggestion, index }: { suggestion: GrocerySuggestion; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `Shopping list for ${suggestion.dish}:\n${suggestion.buy.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      prompt("Copy this list:", text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="glass-card rounded-2xl border border-green-100 dark:border-green-900/40 overflow-hidden animate-slide-up flex flex-col"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="bg-green-500 dark:bg-green-700 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">🍽️</span>
        <h4 className="font-bold text-white text-sm leading-snug flex-1">{suggestion.dish}</h4>
      </div>

      <div className="px-4 py-4 flex flex-col flex-1">
        {/* Reason */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic">{suggestion.reason}</p>

        {/* Buy list */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-2">
          🛒 Add to cart
        </p>
        <ul className="space-y-1.5 flex-1">
          {suggestion.buy.map((item, j) => (
            <li key={j} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 font-medium">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {j + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-xl border transition-all duration-200
            ${copied
              ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 hover:text-green-600 dark:hover:text-green-400 hover:scale-[1.02]"
            }`}
        >
          {copied ? "✓ Copied!" : "📋 Copy list"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function RecipeSkeleton({ index }: { index: number }) {
  return (
    <div
      className="glass-card rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="bg-gray-100 px-6 py-5 flex items-center gap-4">
        <div className="w-8 h-6 bg-gray-300 rounded-full" />
        <div className="h-5 bg-gray-300 rounded-lg w-3/4" />
      </div>
      <div className="px-6 py-5 space-y-5">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="flex gap-2 flex-wrap">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded-full w-20" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
      <div className="px-6 pb-5 pt-1 border-t border-gray-100 flex gap-2">
        <div className="flex-1 h-9 bg-gray-200 rounded-xl" />
        <div className="w-24 h-9 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sizeErrors, setSizeErrors] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [showIngredientPreview, setShowIngredientPreview] = useState(false);
  const [unavailableSuggestions, setUnavailableSuggestions] = useState<string[]>([]);
  const [grocerySuggestions, setGrocerySuggestions] = useState<GrocerySuggestion[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history count on mount + whenever localStorage changes (e.g. delete from sidebar)
  useEffect(() => {
    setHistoryCount(loadHistory().length);
  }, [historyRefreshKey]);

  useEffect(() => {
    const handleStorage = () => setHistoryCount(loadHistory().length);
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // ---------------------------------------------------------------------------
  // File reading helper
  // ---------------------------------------------------------------------------
  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ---------------------------------------------------------------------------
  // Handle new files dropped / selected
  // ---------------------------------------------------------------------------
  const handleImagesAdded = useCallback(
    async (files: File[]) => {
      const errors: string[] = [];
      const validFiles: File[] = [];
      const slotsAvailable = MAX_IMAGES - images.length;

      const filesToProcess = files.slice(0, slotsAvailable);
      const overflow = files.length - slotsAvailable;

      if (overflow > 0) {
        errors.push(
          `Only ${slotsAvailable} image${slotsAvailable !== 1 ? "s" : ""} can be added (max ${MAX_IMAGES} total). ${overflow} file${overflow > 1 ? "s were" : " was"} ignored.`
        );
      }

      for (const file of filesToProcess) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(
            `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${MAX_FILE_SIZE_MB} MB limit and was skipped.`
          );
        } else {
          validFiles.push(file);
        }
      }

      setSizeErrors(errors);

      if (validFiles.length === 0) return;

      const newImageFiles: ImageFile[] = await Promise.all(
        validFiles.map(async (f) => ({
          id: crypto.randomUUID(),
          base64: await readFileAsBase64(f),
          name: f.name,
          sizeMB: f.size / 1024 / 1024,
        }))
      );

      setImages((prev) => [...prev, ...newImageFiles].slice(0, MAX_IMAGES));
      setRecipes(null);
      setError(null);
    },
    [images.length]
  );

  // ---------------------------------------------------------------------------
  // Remove a single image
  // ---------------------------------------------------------------------------
  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSizeErrors([]);
    setRecipes(null);
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Scan ingredients (shows preview panel)
  // ---------------------------------------------------------------------------
  const handleScanIngredients = useCallback(() => {
    if (images.length === 0) return;
    setShowIngredientPreview(true);
    setRecipes(null);
    setError(null);
  }, [images]);

  // ---------------------------------------------------------------------------
  // Generate recipes — called directly OR from IngredientPreview confirmation
  // ---------------------------------------------------------------------------
  const handleGenerate = useCallback(async (confirmedIngredients?: string[]) => {
    if (images.length === 0) return;

    setShowIngredientPreview(false);
    setRecipes(null);
    setError(null);
    setIsLoading(true);

    try {
      // If coming from ingredient preview, pass confirmed list as extra context
      const body = {
        imagesBase64: images.map((img) => img.base64),
        ...(confirmedIngredients ? { confirmedIngredients } : {}),
        ...(dietaryPreferences.length > 0 ? { dietaryPreferences } : {}),
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");

      const generatedRecipes: Recipe[] = data.recipes;
      setRecipes(generatedRecipes);
      setUnavailableSuggestions(data.unavailableSuggestions ?? []);
      setGrocerySuggestions(data.grocerySuggestions ?? []);
      if (data.insufficientIngredients) {
        setError("⚠️ Not enough ingredients detected to make proper recipes. Try uploading clearer photos, or use 'Scan Ingredients' to add items manually.");
      }

      // Save to history
      addHistoryEntry({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        previews: images.map((img) => img.base64),
        recipes: generatedRecipes,
      });
      setHistoryRefreshKey((k) => k + 1);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [images]);

  // ---------------------------------------------------------------------------
  // Restore from history
  // ---------------------------------------------------------------------------
  const handleRestore = useCallback((entry: HistoryEntry) => {
    const restoredImages: ImageFile[] = entry.previews.map((b64, i) => ({
      id: crypto.randomUUID(),
      base64: b64,
      name: `restored-image-${i + 1}`,
      sizeMB: (b64.length * 0.75) / 1024 / 1024,
    }));
    setImages(restoredImages);
    setRecipes(entry.recipes);
    setError(null);
    setSizeErrors([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  const handleReset = () => {
    setImages([]);
    setRecipes(null);
    setError(null);
    setIsLoading(false);
    setSizeErrors([]);
    setShowIngredientPreview(false);
    setUnavailableSuggestions([]);
    setGrocerySuggestions([]);
  };

  const canGenerate = images.length > 0 && !isLoading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ---- Navbar ---- */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-orange-100 dark:border-gray-700/60 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-amber-400 flex items-center justify-center shadow">
              <ChefHatIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight gradient-text">
              Pantry to Plate
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 hidden sm:block">
              Powered by Groq · Llama 4 Vision
            </span>
            {/* Theme toggle */}
            <ThemeToggle />
            {/* History button */}
            <button
              onClick={() => setHistorySidebarOpen(true)}
              className="relative flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 text-gray-600 dark:text-gray-300 text-sm font-medium px-3 py-1.5 rounded-full shadow-sm transition-all duration-200"
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
              {historyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {historyCount > 9 ? "9+" : historyCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ---- History sidebar ---- */}
      <HistorySidebar
        isOpen={historySidebarOpen}
        onClose={() => setHistorySidebarOpen(false)}
        onRestore={handleRestore}
        refreshKey={historyRefreshKey}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ---- Hero ---- */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            🤖 AI-Powered Vision Chef
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
            What&apos;s in your{" "}
            <span className="gradient-text">fridge?</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Drop <strong>1 to {MAX_IMAGES} photos</strong> of your ingredients, fridge contents, or pantry. Our AI chef
            will craft <strong>3 delicious recipes</strong> from everything it sees.
          </p>
        </div>

        {/* ---- Upload card ---- */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="glass-card rounded-2xl p-6 border border-orange-100 dark:border-gray-700">
            {/* File size info banner */}
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 mb-4 text-xs text-amber-700 dark:text-amber-400 font-medium">
              <span>📌</span>
              <span>
                Each image must be <strong>under {MAX_FILE_SIZE_MB} MB</strong>. Files over this limit will be rejected.
                Max <strong>{MAX_IMAGES} images</strong> per generation.
              </span>
            </div>

            <DropzoneArea
              images={images}
              onImagesAdded={handleImagesAdded}
              onRemove={handleRemoveImage}
              isLoading={isLoading}
              sizeErrors={sizeErrors}
            />

            {/* Dietary filters */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <DietaryFilters
                selected={dietaryPreferences}
                onChange={setDietaryPreferences}
                disabled={isLoading}
              />
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {/* Scan ingredients button */}
              <button
                onClick={handleScanIngredients}
                disabled={!canGenerate}
                className={`
                  flex items-center justify-center gap-2 font-semibold text-sm py-3.5 px-5 rounded-xl
                  border transition-all duration-200
                  ${canGenerate
                    ? "bg-white dark:bg-gray-800 border-brand-300 dark:border-brand-600 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:scale-[1.02]"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                <ScanIcon />
                <span>Scan Ingredients</span>
              </button>

              {/* Generate directly button */}
              <button
                onClick={() => handleGenerate()}
                disabled={!canGenerate}
                className={`
                  flex-1 flex items-center justify-center gap-2.5 font-bold text-sm py-3.5 rounded-xl
                  transition-all duration-200
                  ${canGenerate
                    ? "bg-gradient-to-r from-brand-500 to-amber-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] hover:from-brand-600 hover:to-amber-600"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon />
                    <span>Analysing your fridge…</span>
                  </>
                ) : (
                  <>
                    <span>🍳</span>
                    <span>Generate {images.length > 0 ? `Recipes from ${images.length} Photo${images.length > 1 ? "s" : ""}` : "Recipes"}</span>
                  </>
                )}
              </button>

              {(images.length > 0 || error) && !isLoading && (
                <button
                  onClick={handleReset}
                  className="sm:w-auto px-5 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                >
                  ✕ Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Ingredient preview panel ---- */}
        {showIngredientPreview && !isLoading && (
          <div className="max-w-2xl mx-auto mb-10 animate-slide-up">
            <IngredientPreview
              imagesBase64={images.map((img) => img.base64)}
              onConfirm={(ingredients) => handleGenerate(ingredients)}
              onCancel={() => setShowIngredientPreview(false)}
            />
          </div>
        )}

        {/* ---- Loading skeletons ---- */}
        {isLoading && (
          <div ref={resultsRef} className="mb-8">
            <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in">
              <SpinnerIcon />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Analysing {images.length} photo{images.length > 1 ? "s" : ""} and crafting your recipes…
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => <RecipeSkeleton key={i} index={i} />)}
            </div>
          </div>
        )}

        {/* ---- Error state ---- */}
        {error && !isLoading && (
          <div className="max-w-xl mx-auto animate-fade-in mb-8">
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <h3 className="font-semibold text-rose-700 dark:text-rose-400 mb-1">Something went wrong</h3>
                <p className="text-sm text-rose-600 dark:text-rose-500">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- Recipe cards ---- */}
        {recipes && !isLoading && (
          <div ref={resultsRef} className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                🍽️ Your Personalised Recipes
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Crafted exclusively from ingredients visible in your{" "}
                {images.length > 1 ? `${images.length} photos` : "photo"} · Save as PDF or share any recipe
              </p>
            </div>

            {/* Tier legend */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { emoji: "🥄", label: "Everyday", desc: "Simple & quick", bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200 dark:border-sky-800", text: "text-sky-700 dark:text-sky-300" },
                { emoji: "⭐", label: "Impressive", desc: "Creative & flavourful", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300" },
                { emoji: "👨‍🍳", label: "Chef's Special", desc: "Restaurant-quality", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300" },
              ].map(({ emoji, label, desc, bg, border, text }) => (
                <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${bg} ${border}`}>
                  <span>{emoji}</span>
                  <span className={`text-xs font-bold ${text}`}>{label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">— {desc}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recipes.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} index={i} />
              ))}
            </div>


            {/* Grocery suggestions — shown when ingredients are too few */}
            {grocerySuggestions.length > 0 && (
              <div className="mt-10 animate-fade-in">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    🛒 Short on ingredients? Buy a little, cook a lot!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Pick up just a few items and unlock a full meal with what you already have.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {grocerySuggestions.map((s, i) => (
                    <GroceryCard key={i} suggestion={s} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Footer CTA */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-amber-500 text-white font-semibold px-7 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                📷 Try another photo
              </button>
              <button
                onClick={() => setHistorySidebarOpen(true)}
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold px-7 py-3 rounded-full shadow hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-200"
              >
                <HistoryIcon className="w-4 h-4" />
                View history
              </button>
            </div>
          </div>
        )}

        {/* ---- Empty state how-it-works ---- */}
        {images.length === 0 && !isLoading && !error && !recipes && (
          <div className="mt-4 flex flex-wrap justify-center gap-6 text-center animate-fade-in">
            {[
              { emoji: "📸", label: `Upload 1–${MAX_IMAGES} photos of ingredients or fridge` },
              { emoji: "🔍", label: "Scan & edit detected ingredients" },
              { emoji: "🍳", label: "Get 3 custom recipes instantly" },
              { emoji: "💾", label: "Save as PDF or share a link" },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 max-w-[130px]">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow flex items-center justify-center text-2xl">
                  {emoji}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Footer ---- */}
      <footer className="mt-20 py-8 border-t border-orange-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-600 transition-colors">
        Built with Next.js · Groq · Llama 4 Vision · Tailwind CSS · jsPDF
      </footer>
    </main>
  );
}
