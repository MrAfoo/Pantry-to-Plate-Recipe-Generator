import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// ---------------------------------------------------------------------------
// POST /api/substitute
// Body: { ingredient: string, recipeTitle: string }
// Returns 3 substitutes with brief explanations
// ---------------------------------------------------------------------------

export interface Substitute {
  name: string;
  reason: string;
  ratio: string;   // e.g. "1:1", "use half the amount"
}

async function createChatCompletionWithRetry(
  groq: Groq,
  params: Parameters<typeof groq.chat.completions.create>[0],
  retries = 2
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit");

      if (isRateLimit && attempt < retries) {
        const match = errMsg.match(/try again in (\d+)(ms|s)/i);
        let waitMs = 1000 * (attempt + 1);
        if (match) {
          const val = parseInt(match[1], 10);
          waitMs = match[2].toLowerCase() === "s" ? val * 1000 + 200 : val + 200;
        }
        console.warn(`[Groq substitute 429] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Chat completion failed after retries.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredient, recipeTitle } = body as {
      ingredient?: string;
      recipeTitle?: string;
    };

    if (!ingredient?.trim()) {
      return NextResponse.json({ error: "Missing ingredient." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not set." }, { status: 500 });
    }

    const groq = new Groq({ apiKey });
    const chatModel = process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b";
    const isGptOss = chatModel.toLowerCase().includes("gpt-oss");

    const SYSTEM_PROMPT = `You are a professional chef and food scientist specializing in ingredient substitutions.
Given an ingredient and optionally a recipe context, suggest exactly 3 practical substitutes.

STRICT RULES:
1. Return ONLY a valid JSON array of exactly 3 objects — no markdown, no prose.
2. Each object must have:
   - "name"   : string — the substitute ingredient name
   - "reason" : string — one short sentence why it works (max 15 words)
   - "ratio"  : string — how much to use (e.g. "1:1 ratio", "use ¾ the amount")
3. Order by most practical/accessible first.
4. No output outside the JSON array.

Example:
[
  { "name": "Greek yogurt", "reason": "Similar tang and creaminess with added protein.", "ratio": "1:1 ratio" },
  { "name": "Sour cream",   "reason": "Identical texture and acidity profile.",          "ratio": "1:1 ratio" },
  { "name": "Coconut cream","reason": "Dairy-free option with mild sweetness.",           "ratio": "¾ the amount" }
]`;

    const userMessage = recipeTitle
      ? `What are 3 substitutes for "${ingredient}" in a recipe called "${recipeTitle}"?`
      : `What are 3 practical substitutes for "${ingredient}"?`;

    const completion = await createChatCompletionWithRetry(groq, {
      model: chatModel,
      ...(isGptOss ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: isGptOss ? 600 : 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let substitutes: Substitute[];
    try {
      substitutes = JSON.parse(cleaned);
      if (!Array.isArray(substitutes)) throw new Error("Not array");
      substitutes = substitutes.slice(0, 3).map((s) => ({
        name:   s.name   ?? "Unknown",
        reason: s.reason ?? "",
        ratio:  s.ratio  ?? "1:1",
      }));
    } catch {
      return NextResponse.json(
        { error: "Could not parse substitutes. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ substitutes }, { status: 200 });
  } catch (err) {
    console.error("Substitute error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
