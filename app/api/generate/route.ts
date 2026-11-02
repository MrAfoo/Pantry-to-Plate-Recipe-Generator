import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Nutrition {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  prepTime: string;
}

export interface Recipe {
  title: string;
  tag: "common" | "good" | "special";
  ingredients: string[];
  steps: string[];
  nutrition: Nutrition;
  tip?: string;
}

export interface GrocerySuggestion {
  dish: string;
  buy: string[];
  reason: string;
}

export interface GenerateResponse {
  recipes: Recipe[];
  unavailableSuggestions?: string[];
  grocerySuggestions?: GrocerySuggestion[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
        // Try to parse suggested delay (e.g. "try again in 45ms")
        const match = errMsg.match(/try again in (\d+)(ms|s)/i);
        let waitMs = 1000 * (attempt + 1);
        if (match) {
          const val = parseInt(match[1], 10);
          waitMs = match[2].toLowerCase() === "s" ? val * 1000 + 200 : val + 200;
        }
        console.warn(`[Groq 429] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Chat completion failed after retries.");
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, imagesBase64, confirmedIngredients, dietaryPreferences } = body as {
      imageBase64?: string;
      imagesBase64?: string[];
      confirmedIngredients?: string[];
      dietaryPreferences?: string[];
    };

    const images: string[] = imagesBase64?.length
      ? imagesBase64
      : imageBase64
      ? [imageBase64]
      : [];

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No image data received. Please upload at least one image." },
        { status: 400 }
      );
    }

    for (const img of images) {
      if (!img.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Invalid image format. Expected base64 data URLs." },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: GROQ_API_KEY is not set." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });
    // Vision model: must support image input (qwen/qwen3.8-27b on Groq)
    const visionModel = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
    // Chat model: text-only — use OpenAI GPT-OSS-120B on Groq (separate rate limit bucket, no 1000 OTPM lock)
    const chatModel = process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b";

    // Optional context injected into the prompt
    const ingredientContext = confirmedIngredients?.length
      ? ` User confirmed: ${confirmedIngredients.join(", ")}.`
      : "";

    const dietaryContext = dietaryPreferences?.length
      ? ` DIETARY: ${dietaryPreferences.join(", ")} — ALL recipes must comply. If key ingredients for the diet are missing, add grocerySuggestions.`
      : "";

    // ---- Compact system prompt (token-efficient) ---------------------------
    const SYSTEM_PROMPT = `You are a chef. Given a list of ingredients, return ONLY valid JSON — no prose, no markdown.

JSON shape:
{"recipes":[{"title":"...","tag":"common|good|special","ingredients":["..."],"steps":["...","...","..."],"nutrition":{"calories":"~Xkcal","protein":"Xg","carbs":"Xg","fat":"Xg","prepTime":"X mins"},"tip":"..."}],"unavailableSuggestions":["..."],"grocerySuggestions":[{"dish":"...","buy":["..."],"reason":"..."}]}

Rules:
- Return exactly 3 recipes: tag "common" (simple), "good" (impressive), "special" (rice or flatbread dish — assume rice/flatbread available as pantry staple).
- steps: 3–5 short steps only.
- tip: one short sentence (optional).
- unavailableSuggestions: up to 3 popular dishes the ingredients cannot make.
- grocerySuggestions: only if fewer than 5 ingredients OR they don't form a proper meal. If shown, exactly 3 items. reason: friendly, max 20 words. Otherwise set to [].
- nutrition: realistic estimates per serving.
- NO drinks/beverages as recipes.${ingredientContext}${dietaryContext}`;

    let ingredientsList: string = confirmedIngredients?.join(", ") ?? "";

    if (!ingredientsList) {
      // STEP 1 (Vision): Identify ingredients — chunk into batches of ≤3 images
      const CHUNK_SIZE = 3;
      const chunks: string[][] = [];
      for (let i = 0; i < images.length; i += CHUNK_SIZE) {
        chunks.push(images.slice(i, i + CHUNK_SIZE));
      }

      const chunkResults = await Promise.all(
        chunks.map(async (chunk) => {
          const imageBlocks: Groq.Chat.ChatCompletionContentPart[] = chunk.map(
            (img) => ({ type: "image_url" as const, image_url: { url: img } })
          );

          const visionCompletion = await createChatCompletionWithRetry(groq, {
            model: visionModel,
            messages: [
              {
                role: "system",
                content: "List all visible food items as a short comma-separated list. No prose.",
              },
              {
                role: "user",
                content: [
                  ...imageBlocks,
                  { type: "text" as const, text: "List every food item visible, comma-separated." },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 250,
          });

          const rawVision = visionCompletion.choices[0]?.message?.content ?? "";
          return rawVision.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        })
      );

      ingredientsList = chunkResults.filter(Boolean).join(", ");
    }

    // STEP 2 (Chef/Brain): Generate 3 tiered recipes in compact JSON
    const isGptOss = chatModel.toLowerCase().includes("gpt-oss");
    const completion = await createChatCompletionWithRetry(groq, {
      model: chatModel,
      ...(isGptOss ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Ingredients: ${ingredientsList}. Generate 3 tiered recipes. JSON only.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: isGptOss ? 1500 : 900,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

    // ---- Parse JSON safely ------------------------------------------------
    let parsed: GenerateResponse;
    try {
      let clean = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        clean = codeBlockMatch[1].trim();
      } else {
        const firstBrace = clean.indexOf("{");
        const lastBrace = clean.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          clean = clean.slice(firstBrace, lastBrace + 1);
        }
      }
      parsed = JSON.parse(clean);
    } catch {
      console.error("JSON parse error. Raw content:", rawContent);
      return NextResponse.json(
        { error: "The AI returned an unexpected format. Please try again.", raw: rawContent },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.recipes) || parsed.recipes.length === 0) {
      return NextResponse.json(
        { error: "The AI returned an empty or invalid recipe list." },
        { status: 502 }
      );
    }

    // ---- Normalise --------------------------------------------------------
    const tags: Array<"common" | "good" | "special"> = ["common", "good", "special"];
    const normalised: Recipe[] = parsed.recipes.slice(0, 3).map((r, i) => ({
      title: r.title ?? `Recipe ${i + 1}`,
      tag: r.tag ?? tags[i],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
      nutrition: r.nutrition ?? {
        calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A", prepTime: "N/A",
      },
      tip: r.tip,
    }));

    const unavailableSuggestions = Array.isArray(parsed.unavailableSuggestions)
      ? parsed.unavailableSuggestions.slice(0, 6)
      : [];

    const insufficientIngredients = normalised.every((r) => r.ingredients.length <= 2);

    const grocerySuggestions: GrocerySuggestion[] = Array.isArray(parsed.grocerySuggestions)
      ? parsed.grocerySuggestions
          .filter((g) => g.dish && Array.isArray(g.buy) && g.buy.length > 0 && g.reason)
          .slice(0, 3)
      : [];

    return NextResponse.json(
      { recipes: normalised, unavailableSuggestions, insufficientIngredients, grocerySuggestions },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("API route error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
