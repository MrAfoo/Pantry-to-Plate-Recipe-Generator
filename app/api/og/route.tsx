import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/og
// Generates a simple SVG-based Open Graph image (1200×630).
// Works without @vercel/og — pure SVG returned as image/svg+xml,
// which WhatsApp, Twitter, and most platforms accept.
//
// Query params:
//   title     — recipe title
//   tag       — "common" | "good" | "special"
//   calories  — e.g. "~380 kcal"
//   prepTime  — e.g. "20 mins"
// ---------------------------------------------------------------------------

const TAG_CONFIG: Record<string, { emoji: string; label: string; color: string; lightColor: string }> = {
  common:  { emoji: "🥄", label: "Everyday Recipe",    color: "#0284c7", lightColor: "#e0f2fe" },
  good:    { emoji: "⭐",  label: "Impressive Recipe",  color: "#7c3aed", lightColor: "#ede9fe" },
  special: { emoji: "👨‍🍳", label: "Chef's Special",     color: "#d97706", lightColor: "#fef3c7" },
};

// Wrap text into lines of max `maxChars` characters
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title    = searchParams.get("title")    ?? "AI-Generated Recipe";
  const tag      = searchParams.get("tag")      ?? "special";
  const calories = searchParams.get("calories") ?? "";
  const prepTime = searchParams.get("prepTime") ?? "";

  const cfg = TAG_CONFIG[tag] ?? TAG_CONFIG.special;
  const titleLines = wrapText(title, 28);

  // Build title text SVG elements
  const titleFontSize = titleLines.length > 2 ? 52 : 60;
  const titleStartY   = titleLines.length > 2 ? 220 : 230;
  const titleSVG = titleLines
    .map((line, i) => `<text x="80" y="${titleStartY + i * (titleFontSize + 10)}" font-family="Georgia, serif" font-size="${titleFontSize}" font-weight="700" fill="#1a1a1a">${line}</text>`)
    .join("\n");

  const metaY = titleStartY + titleLines.length * (titleFontSize + 10) + 30;

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff7ed"/>
      <stop offset="100%" stop-color="#fef3c7"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Top orange bar -->
  <rect width="1200" height="10" fill="url(#accent)"/>

  <!-- Bottom orange bar -->
  <rect y="620" width="1200" height="10" fill="url(#accent)"/>

  <!-- Left decorative strip -->
  <rect x="0" y="10" width="8" height="610" fill="url(#accent)" opacity="0.4"/>

  <!-- Large decorative circle (top right) -->
  <circle cx="1100" cy="80" r="180" fill="#f97316" opacity="0.06"/>
  <circle cx="1050" cy="550" r="120" fill="#f59e0b" opacity="0.07"/>

  <!-- Brand pill top-left -->
  <rect x="60" y="50" width="260" height="44" rx="22" fill="url(#accent)"/>
  <text x="180" y="79" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="white" text-anchor="middle">🍽️ Pantry to Plate</text>

  <!-- Tag badge -->
  <rect x="60" y="115" width="240" height="38" rx="19" fill="${cfg.lightColor}"/>
  <text x="80" y="140" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${cfg.color}">${cfg.emoji}  ${cfg.label}</text>

  <!-- Recipe title -->
  ${titleSVG}

  <!-- Meta row (calories + prep time) -->
  ${calories || prepTime ? `
  <rect x="60" y="${metaY}" width="${(calories && prepTime) ? 380 : 220}" height="48" rx="12" fill="white" opacity="0.7"/>
  ${calories ? `
  <text x="82" y="${metaY + 20}" font-family="Arial, sans-serif" font-size="15" fill="#6b7280">🔥 Calories</text>
  <text x="82" y="${metaY + 40}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1a1a1a">${calories}</text>
  ` : ""}
  ${prepTime ? `
  <text x="${calories ? "230" : "82"}" y="${metaY + 20}" font-family="Arial, sans-serif" font-size="15" fill="#6b7280">⏱ Prep Time</text>
  <text x="${calories ? "230" : "82"}" y="${metaY + 40}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#1a1a1a">${prepTime}</text>
  ` : ""}
  ` : ""}

  <!-- Bottom tagline -->
  <text x="80" y="590" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">Made from fridge ingredients · Powered by Groq AI · pantry-to-plate.app</text>

  <!-- Decorative fork/knife shape (right side) -->
  <text x="950" y="360" font-family="Arial" font-size="220" fill="#f97316" opacity="0.08">🍳</text>
</svg>`.trim();

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
