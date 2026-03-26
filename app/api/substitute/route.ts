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

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

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
