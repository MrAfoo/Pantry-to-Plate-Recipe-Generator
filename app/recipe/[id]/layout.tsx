import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Dynamic OG metadata for the recipe share page.
// Since the recipe lives in the URL hash (client-side), we generate generic
// but rich metadata that makes the share card look great on WhatsApp/Twitter.
// For full dynamic titles, use the ?title= search param (set by the share button).
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ title?: string; tag?: string; calories?: string; prepTime?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;

  const title = sp.title
    ? decodeURIComponent(sp.title)
    : "AI-Generated Recipe";

  const tag = sp.tag ?? "special";
  const tagLabel =
    tag === "common" ? "🥄 Everyday Recipe" :
    tag === "good"   ? "⭐ Impressive Recipe" :
                       "👨‍🍳 Chef's Special";

  const calories  = sp.calories  ? decodeURIComponent(sp.calories)  : null;
  const prepTime  = sp.prepTime  ? decodeURIComponent(sp.prepTime)  : null;

  const description = [
    tagLabel,
    calories  ? `${calories}` : null,
    prepTime  ? `Ready in ${prepTime}` : null,
    "Made with ingredients from your fridge · Pantry to Plate AI Chef",
  ].filter(Boolean).join(" · ");

  const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&tag=${tag}${calories ? `&calories=${encodeURIComponent(calories)}` : ""}${prepTime ? `&prepTime=${encodeURIComponent(prepTime)}` : ""}`;

  return {
    title: `${title} — Pantry to Plate`,
    description,
    openGraph: {
      title: `${title} — Pantry to Plate`,
      description,
      type: "article",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Pantry to Plate`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function RecipeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
