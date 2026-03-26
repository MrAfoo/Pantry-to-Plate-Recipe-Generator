import type { Metadata } from "next";

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
    calories  ? `${calories}` : null,
    prepTime  ? `Ready in ${prepTime}` : null,
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

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
