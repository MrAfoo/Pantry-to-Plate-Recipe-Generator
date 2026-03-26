"use client";

// ---------------------------------------------------------------------------
// DietaryFilters — lets users set dietary preferences before generating
// ---------------------------------------------------------------------------

export type DietaryPreference =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "keto"
  | "halal"
  | "low-calorie";

interface Filter {
  id: DietaryPreference;
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
}

const FILTERS: Filter[] = [
  { id: "vegetarian",  label: "Vegetarian",  emoji: "🥦", color: "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",   activeColor: "bg-green-500 border-green-500 text-white" },
  { id: "vegan",       label: "Vegan",       emoji: "🌱", color: "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400", activeColor: "bg-emerald-500 border-emerald-500 text-white" },
  { id: "gluten-free", label: "Gluten-Free", emoji: "🌾", color: "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400",   activeColor: "bg-amber-500 border-amber-500 text-white" },
  { id: "dairy-free",  label: "Dairy-Free",  emoji: "🥛", color: "border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400",       activeColor: "bg-sky-500 border-sky-500 text-white" },
  { id: "keto",        label: "Keto",        emoji: "🥩", color: "border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400",     activeColor: "bg-rose-500 border-rose-500 text-white" },
  { id: "halal",       label: "Halal",       emoji: "☪️", color: "border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400", activeColor: "bg-violet-500 border-violet-500 text-white" },
  { id: "low-calorie", label: "Low Calorie", emoji: "⚖️", color: "border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400", activeColor: "bg-orange-500 border-orange-500 text-white" },
];

interface Props {
  selected: DietaryPreference[];
  onChange: (prefs: DietaryPreference[]) => void;
  disabled?: boolean;
}

export default function DietaryFilters({ selected, onChange, disabled }: Props) {
  const toggle = (id: DietaryPreference) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Dietary Preferences
        </p>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            disabled={disabled}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-rose-500 transition"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = selected.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              disabled={disabled}
              className={`
                flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border
                transition-all duration-200
                ${isActive
                  ? `${f.activeColor} shadow-sm scale-[1.03]`
                  : `bg-white dark:bg-gray-800 ${f.color} hover:scale-[1.03] hover:shadow-sm`
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
              {isActive && <span className="ml-0.5 opacity-80">✓</span>}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-2 font-medium">
          ✓ AI will generate recipes respecting: {selected.join(", ")}
        </p>
      )}
    </div>
  );
}
