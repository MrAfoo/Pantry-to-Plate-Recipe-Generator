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
1. Return ONLY a valid JSON array of strings — no markdown, no prose, no explanation.
2. Each string is a single ingredient name, as specific as possible (e.g. "cherry tomatoes" not just "tomatoes").
3. Include every distinct item you can see, even partial items.
4. Do NOT include non-food items (plates, containers, shelves).
5. Do NOT output anything outside the JSON array.

Example output:
["eggs", "butter", "cheddar cheese", "milk", "spinach", "garlic", "olive oil"]`;

    const imageBlocks: Groq.Chat.ChatCompletionContentPart[] = imagesBase64.map(
      (img) => ({ type: "image_url" as const, image_url: { url: img } })
    );

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text" as const,
              text: "List every food ingredient you can see across all these images. Return strict JSON array only.",
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let ingredients: string[];
    try {
      ingredients = JSON.parse(cleaned);
      if (!Array.isArray(ingredients)) throw new Error("Not an array");
      // Normalise: strings only, trimmed, no empty entries
      ingredients = ingredients
        .filter((i) => typeof i === "string" && i.trim().length > 0)
        .map((i) => i.trim());
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
