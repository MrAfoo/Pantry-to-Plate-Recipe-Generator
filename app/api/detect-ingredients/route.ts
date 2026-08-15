import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

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

    const SYSTEM_PROMPT = `You are a precise ingredient-detection assistant.
Look carefully at ALL the food items, ingredients, condiments, vegetables, fruits, dairy, meats, and beverages visible across all the provided images.

STRICT RULES:
1. Return ONLY a valid JSON object with the key "ingredients" containing an array of strings.
2. Each string is a single ingredient name, as specific as possible (e.g. "cherry tomatoes" not just "tomatoes").
3. Include every distinct item you can see, even partial items.
4. Do NOT include non-food items (plates, containers, shelves).

Example output:
{
  "ingredients": ["eggs", "butter", "cheddar cheese", "milk", "spinach", "garlic", "olive oil"]
}`;

    const imageBlocks: Groq.Chat.ChatCompletionContentPart[] = imagesBase64.map(
      (img) => ({ type: "image_url" as const, image_url: { url: img } })
    );

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text" as const,
              text: "List every food ingredient you can see across all these images. Return JSON object with 'ingredients' array.",
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Robust extraction that handles reasoning, markdown fences, and raw json
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

      // Normalise: strings only, trimmed, no empty entries
      ingredients = ingredients
        .filter((i) => typeof i === "string" && i.trim().length > 0)
        .map((i) => i.trim());

      if (ingredients.length === 0) {
        throw new Error("No ingredients found");
      }
    } catch {
      console.error("Ingredient parse error. Raw:", raw);
      return NextResponse.json(
        { error: "Could not parse ingredient list. Please try again.", raw },
        { status: 502 }
      );
    }

    return NextResponse.json({ ingredients }, { status: 200 });
  } catch (err: unknown) {
    console.error("Detect-ingredients error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
