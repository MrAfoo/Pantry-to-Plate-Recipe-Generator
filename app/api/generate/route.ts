import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Nutrition {
  calories: string;       // e.g. "~420 kcal"
  protein: string;        // e.g. "22g"
  carbs: string;          // e.g. "35g"
  fat: string;            // e.g. "18g"
  prepTime: string;       // e.g. "15 mins"
}

export interface Recipe {
  title: string;
  tag: "common" | "good" | "special";   // recipe tier
  ingredients: string[];
  steps: string[];
  nutrition: Nutrition;
  tip?: string;           // optional chef's tip
}

export interface GenerateResponse {
  recipes: Recipe[];
  unavailableSuggestions?: string[];  // e.g. ["pizza", "pasta"] if missing key ingredients
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, imagesBase64, confirmedIngredients } = body as {
      imageBase64?: string;
      imagesBase64?: string[];
      confirmedIngredients?: string[];
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

    // Build confirmed ingredients context if provided
    const ingredientContext = confirmedIngredients?.length
      ? `\nThe user has confirmed these specific ingredients are available: ${confirmedIngredients.join(", ")}.`
      : "";

    const imageWord = images.length > 1 ? "images" : "image";

    // ---- System prompt ----------------------------------------------------
    const SYSTEM_PROMPT = `You are a master chef and nutritionist with encyclopedic knowledge of world cuisines.
Look carefully at ALL the ingredients visible across all the ${imageWord} provided.${ingredientContext}

YOUR TASK: Return exactly 3 recipes following this STRICT TIER SYSTEM:

RECIPE TIER RULES:
1. Recipe #1 — tag: "common" — A simple, everyday meal anyone can make with the visible ingredients (e.g. scrambled eggs, toast, simple salad). Must be achievable with ONLY what is visible.
2. Recipe #2 — tag: "good" — A more impressive, flavourful dish using the visible ingredients creatively (e.g. a stir-fry, frittata, grain bowl). Must use ONLY visible ingredients.
3. Recipe #3 — tag: "special" — The BEST possible dish from these ingredients, restaurant-quality if possible. Must use ONLY visible ingredients.

ADDITIONAL TASK — unavailableSuggestions:
Look at the ingredients. Think of popular dishes people often want (pizza, burger, pasta, sushi, etc.). 
If the ingredients are clearly NOT sufficient to make those dishes, list up to 4 such dish names in "unavailableSuggestions".
If the ingredients ARE sufficient for those dishes, do NOT include them (they should appear as recipes instead).

NUTRITION: For each recipe, estimate realistic nutritional info per serving:
- calories (e.g. "~380 kcal")
- protein (e.g. "24g")
- carbs (e.g. "30g")  
- fat (e.g. "14g")
- prepTime (e.g. "20 mins")

STRICT OUTPUT RULES:
1. Return ONLY valid JSON — no markdown fences, no prose, no explanation outside JSON.
2. Top-level keys: "recipes" (array of 3) and optionally "unavailableSuggestions" (array of strings).
3. Each recipe object must have: "title", "tag", "ingredients", "steps", "nutrition", and optionally "tip".
4. "ingredients": array of strings from visible ingredients only.
5. "steps": array of clear cooking steps (3–8 steps).
6. "tip": one short chef's tip for this recipe (optional but encouraged).
7. Do NOT invent ingredients not visible in the ${imageWord}.

Example shape (content is fictional — follow only the structure):
{
  "recipes": [
    {
      "title": "Simple Cheese Omelette",
      "tag": "common",
      "ingredients": ["3 eggs", "cheddar cheese", "butter", "salt", "pepper"],
      "steps": ["Beat eggs with salt and pepper.", "Melt butter in pan.", "Pour eggs, add cheese, fold."],
      "nutrition": { "calories": "~320 kcal", "protein": "20g", "carbs": "2g", "fat": "25g", "prepTime": "10 mins" },
      "tip": "Use medium-low heat for a creamier texture."
    }
  ],
  "unavailableSuggestions": ["pizza", "sushi"]
}`;

    // Build image blocks
    const imageBlocks: Groq.Chat.ChatCompletionContentPart[] = images.map(
      (img) => ({ type: "image_url" as const, image_url: { url: img } })
    );

    const userContent: Groq.Chat.ChatCompletionContentPart[] = [
      ...imageBlocks,
      {
        type: "text" as const,
        text:
          images.length > 1
            ? `Here are ${images.length} photos of my fridge/pantry. Generate exactly 3 tiered recipes (1 common, 1 good, 1 special) and note any popular dishes I can't make. Respond in strict JSON only.`
            : "Here is a photo of my fridge/pantry. Generate exactly 3 tiered recipes (1 common, 1 good, 1 special) and note any popular dishes I can't make. Respond in strict JSON only.",
      },
    ];

    // ---- Call Groq Vision -------------------------------------------------
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 3000,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

    // ---- Parse JSON safely ------------------------------------------------
    const cleaned = rawContent
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: GenerateResponse;
    try {
      parsed = JSON.parse(cleaned);
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

    return NextResponse.json(
      { recipes: normalised, unavailableSuggestions },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("API route error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
