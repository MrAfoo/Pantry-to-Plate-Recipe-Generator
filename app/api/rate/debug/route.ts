import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// GET /api/rate/debug
// Verifies Redis env vars and connection — remove this route after debugging
// ---------------------------------------------------------------------------
export async function GET() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({
      status: "error",
      message: "Env vars missing",
      UPSTASH_REDIS_REST_URL: url ? "SET" : "MISSING",
      UPSTASH_REDIS_REST_TOKEN: token ? "SET" : "MISSING",
    }, { status: 500 });
  }

  try {
    const client = new Redis({ url, token });
    // Write a test key and read it back
    await client.set("ptp:debug:ping", "pong", { ex: 60 });
    const val = await client.get("ptp:debug:ping");
    // List all ptp:rating:* keys
    const keys = await client.keys("ptp:rating:*");

    return NextResponse.json({
      status: "ok",
      message: "Redis connected successfully",
      UPSTASH_REDIS_REST_URL: "SET",
      UPSTASH_REDIS_REST_TOKEN: "SET",
      pingTest: val === "pong" ? "PASSED" : "FAILED",
      ratingKeys: keys,
      ratingKeyCount: keys.length,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      message: "Redis connection failed",
      error: err instanceof Error ? err.message : String(err),
      UPSTASH_REDIS_REST_URL: "SET",
      UPSTASH_REDIS_REST_TOKEN: "SET",
    }, { status: 500 });
  }
}
