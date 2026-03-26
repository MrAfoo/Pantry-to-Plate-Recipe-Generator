import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// In-memory rating store (persists for server lifetime / serverless warm instance)
// For production, replace with a DB like Upstash Redis, Supabase, or PlanetScale.
// ---------------------------------------------------------------------------
interface RatingEntry {
  good: number;
  bad: number;
}

const ratings = new Map<string, RatingEntry>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a stable ID from the recipe title so the same recipe always maps to the same key */
function recipeId(title: string): string {
  return createHash("sha256").update(title.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function getEntry(id: string): RatingEntry {
  if (!ratings.has(id)) ratings.set(id, { good: 0, bad: 0 });
  return ratings.get(id)!;
}

// ---------------------------------------------------------------------------
// GET /api/rate?title=<recipe title>
// Returns current rating counts for a recipe
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) {
    return NextResponse.json({ error: "Missing title param." }, { status: 400 });
  }
  const id = recipeId(title);
  const entry = getEntry(id);
  return NextResponse.json({ id, good: entry.good, bad: entry.bad }, { status: 200 });
}

// ---------------------------------------------------------------------------
// POST /api/rate
// Body: { title: string, vote: "good" | "bad" }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, vote } = body as { title?: string; vote?: string };

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Missing or invalid title." }, { status: 400 });
    }
    if (vote !== "good" && vote !== "bad") {
      return NextResponse.json({ error: "Vote must be 'good' or 'bad'." }, { status: 400 });
    }

    const id = recipeId(title);
    const entry = getEntry(id);
    entry[vote]++;

    return NextResponse.json(
      { id, good: entry.good, bad: entry.bad, voted: vote },
      { status: 200 }
    );
  } catch (err) {
    console.error("Rating error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
