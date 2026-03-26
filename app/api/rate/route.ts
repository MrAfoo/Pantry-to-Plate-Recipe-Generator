import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Upstash Redis client
// Falls back to in-memory store if env vars are not set (local dev without Redis).
// ---------------------------------------------------------------------------
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("[rate] Upstash env vars not set — falling back to in-memory store.");
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when Redis is not configured)
// ---------------------------------------------------------------------------
interface RatingEntry { good: number; bad: number; }
const memoryStore = new Map<string, RatingEntry>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stable Redis key from recipe title */
function ratingKey(title: string): string {
  const hash = createHash("sha256").update(title.trim().toLowerCase()).digest("hex").slice(0, 16);
  return `ptp:rating:${hash}`;
}

/** Read ratings — Redis first, fallback to memory */
async function getRatings(title: string): Promise<RatingEntry> {
  const key = ratingKey(title);
  const client = getRedis();

  if (client) {
    // Redis stores as hash: { good: "5", bad: "2" }
    const data = await client.hgetall<Record<string, string>>(key);
    if (data) {
      return {
        good: parseInt(data.good ?? "0", 10),
        bad:  parseInt(data.bad  ?? "0", 10),
      };
    }
    return { good: 0, bad: 0 };
  }

  // Memory fallback
  return memoryStore.get(key) ?? { good: 0, bad: 0 };
}

/** Increment a vote — Redis first, fallback to memory */
async function incrementVote(title: string, vote: "good" | "bad"): Promise<RatingEntry> {
  const key = ratingKey(title);
  const client = getRedis();

  if (client) {
    // HINCRBY is atomic — safe for concurrent requests
    await client.hincrby(key, vote, 1);
    // Set a long TTL (1 year) so keys don't expire unexpectedly
    await client.expire(key, 60 * 60 * 24 * 365);
    const data = await client.hgetall<Record<string, string>>(key);
    return {
      good: parseInt(data?.good ?? "0", 10),
      bad:  parseInt(data?.bad  ?? "0", 10),
    };
  }

  // Memory fallback
  const existing = memoryStore.get(key) ?? { good: 0, bad: 0 };
  existing[vote]++;
  memoryStore.set(key, existing);
  return existing;
}

// ---------------------------------------------------------------------------
// GET /api/rate?title=<recipe title>
// Returns current rating counts
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  if (!title) {
    return NextResponse.json({ error: "Missing title param." }, { status: 400 });
  }

  try {
    const entry = await getRatings(title);
    return NextResponse.json({ good: entry.good, bad: entry.bad }, { status: 200 });
  } catch (err) {
    console.error("[rate GET] Redis error:", err);
    return NextResponse.json({ error: "Could not fetch ratings." }, { status: 500 });
  }
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

    const entry = await incrementVote(title, vote);
    return NextResponse.json(
      { good: entry.good, bad: entry.bad, voted: vote },
      { status: 200 }
    );
  } catch (err) {
    console.error("[rate POST] Redis error:", err);
    return NextResponse.json({ error: "Could not submit vote." }, { status: 500 });
  }
}
