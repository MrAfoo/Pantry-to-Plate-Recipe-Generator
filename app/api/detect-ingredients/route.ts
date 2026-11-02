import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractIngredients(raw: string): string[] {
  let ingredients: string[] = [];
  try {
    let clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    } else {
      const firstBrace = clean.search(/[\{\[]/);
      const lastBrace = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      ingredients = parsed;
    } else if (parsed && Array.isArray(parsed.ingredients)) {
      ingredients = parsed.ingredients;
    } else if (parsed && typeof parsed === "object") {
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
      if (Array.isArray(firstArray)) {
        ingredients = firstArray as string[];
      }
    }

    return ingredients
      .filter((i) => typeof i === "string" && i.trim().length > 0)
      .map((i) => i.trim());
  } catch {
    return [];
  }
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
        console.warn(`[Groq detect-ingredients 429] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Chat completion failed after retries.");
}

// ---------------------------------------------------------------------------
// POST /api/detect-ingredients
// Send one or more images → get back a flat list of detected ingredients
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imagesBase64 } = body as { imagesBase64?: string[] };

    if (!imagesBase64 || imagesBase64.length === 0) {
      return NextResponse.json(
        { error: "No images provided." },
        { status: 400 }
      );
    }

    for (const img of imagesBase64) {
      if (!img.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Invalid image format." },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });
    const visionModel = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

    const SYSTEM_PROMPT = `Return ONLY a JSON object: {"ingredients":["item1","item2",...]}. List every food item, ingredient, condiment, dairy, meat, or produce visible. Be specific (e.g. "cherry tomatoes"). Exclude non-food items. No prose.`;

    // Groq supports up to 3 images per request. Chunk larger lists into batches of <= 3.
    const CHUNK_SIZE = 3;
    const chunks: string[][] = [];
    for (let i = 0; i < imagesBase64.length; i += CHUNK_SIZE) {
      chunks.push(imagesBase64.slice(i, i + CHUNK_SIZE));
    }

    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const imageBlocks: Groq.Chat.ChatCompletionContentPart[] = chunk.map(
          (img) => ({ type: "image_url" as const, image_url: { url: img } })
        );

        const completion = await createChatCompletionWithRetry(groq, {
          model: visionModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                ...imageBlocks,
                {
                  type: "text" as const,
                  text: "List every food ingredient visible. Return JSON with 'ingredients' array.",
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 400,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        return extractIngredients(raw);
      })
    );

    // Merge and deduplicate
    const ingredients = Array.from(
      new Set(chunkResults.flat().map((i) => i.trim()).filter(Boolean))
    );

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "No ingredients detected in the uploaded photos. Please try clearer images.", ingredients: [] },
        { status: 200 }
      );
    }

    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (err: unknown) {
    console.error("Detect-ingredients error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
