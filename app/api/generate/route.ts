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

export interface GrocerySuggestion {
  dish: string;          // e.g. "Spaghetti Bolognese"
  buy: string[];         // e.g. ["spaghetti", "minced beef", "tomato paste"]
  reason: string;        // e.g. "You already have onion and garlic — just grab these!"
}

export interface GenerateResponse {
  recipes: Recipe[];
  unavailableSuggestions?: string[];   // e.g. ["pizza", "pasta"] if missing key ingredients
  grocerySuggestions?: GrocerySuggestion[]; // shown when ingredients are insufficient
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

    // Build confirmed ingredients context if provided
    const ingredientContext = confirmedIngredients?.length
      ? `\nThe user has confirmed these specific ingredients are available: ${confirmedIngredients.join(", ")}.`
      : "";

    // Build dietary preferences context + conflict detection
    const dietaryContext = dietaryPreferences?.length
      ? `\nCRITICAL DIETARY REQUIREMENTS: The user follows these dietary preferences: ${dietaryPreferences.join(", ")}.
ALL 3 recipes MUST strictly comply with these requirements.
Do NOT include any ingredients that violate these preferences.

DIETARY CONFLICT HANDLING — VERY IMPORTANT:
Some dietary preferences require specific KEY INGREDIENTS that may not be visible in the image.
Examples:
- "keto" requires high-fat, low-carb foods: meat, fish, eggs, cheese, nuts, avocado, butter, cream. If NO meat/protein source is visible and the user selected "keto", you MUST add a grocerySuggestion telling them to buy the missing keto protein (e.g. chicken, beef, salmon) and how it combines with what they have.
- "vegan" requires no animal products: if eggs/dairy are the only protein visible, suggest plant proteins to buy.
- "halal" requires halal-certified meat: if no halal meat is visible, suggest buying it.
- "high-protein" / "keto": if no protein source visible, flag this in grocerySuggestions.

If the visible ingredients CANNOT satisfy the selected dietary preference properly, STILL generate 3 recipes as best you can, BUT also add grocerySuggestions that say something like: "You chose keto but there's no meat or protein visible — just pick up some chicken breast and combine with your [visible ingredients] for a proper keto meal!"`
      : "";

    const imageWord = images.length > 1 ? "images" : "image";

    // ---- System prompt ----------------------------------------------------
    const SYSTEM_PROMPT = `You are a master chef and nutritionist with encyclopedic knowledge of world cuisines.

IMAGE ANALYSIS INSTRUCTIONS — READ CAREFULLY:
- Examine every corner of the ${imageWord} with extreme attention to detail
- Identify ALL food items: fresh produce, packaged goods, condiments, sauces, dairy, leftovers, spices
- Read labels and packaging text where visible to identify specific products
- Note quantities and freshness where relevant (e.g. "half an onion", "leftover cooked rice")
- Do NOT miss items at the back, on shelves, in containers, or partially visible
- Identify the cuisine style the ingredients suggest (Asian, Mediterranean, Western, etc.)
- Only list ingredients you can actually SEE — do not invent or assume

Look carefully at ALL the ingredients visible across all the ${imageWord} provided.${ingredientContext}${dietaryContext}

YOUR TASK: Return exactly 3 recipes following this STRICT TIER SYSTEM:

IMPORTANT: ALL 3 recipes MUST be solid FOOD dishes (meals you eat with a fork/spoon/hands).
Do NOT suggest drinks, smoothies, juices, shakes, teas, coffees, or any beverage — even if liquid ingredients are visible.
Focus on cooked or assembled food dishes only.

RECIPE TIER RULES:
1. Recipe #1 — tag: "common" — A simple, everyday meal anyone can make with the visible ingredients (e.g. scrambled eggs, toast, simple salad). Must be achievable with ONLY what is visible.
2. Recipe #2 — tag: "good" — A more impressive, flavourful dish using the visible ingredients creatively (e.g. a stir-fry, frittata, grain bowl). Must use ONLY visible ingredients.
3. Recipe #3 — tag: "special" — MUST be a rice dish OR a flatbread/bread-based dish (e.g. fried rice, pilaf, biryani, rice bowl, naan wrap, flatbread pizza, stuffed flatbread, quesadilla, pita pocket).
   IMPORTANT FOR RECIPE #3: Rice and flatbreads/bread are PANTRY STAPLES — people keep them in cupboards, not in the fridge. So even if rice or flatbread is NOT visible in the image, you MAY assume the user has plain white rice or basic flatbread/tortilla available as a pantry staple.
   Build Recipe #3 around the visible ingredients served WITH rice or ON/IN flatbread. Make it restaurant-quality and exciting.

ADDITIONAL TASK — unavailableSuggestions:
Look at the ingredients. Think of popular dishes people often want (pizza, burger, pasta, sushi, etc.). 
If the ingredients are clearly NOT sufficient to make those dishes, list up to 4 such dish names in "unavailableSuggestions".
If the ingredients ARE sufficient for those dishes, do NOT include them (they should appear as recipes instead).

ADDITIONAL TASK — grocerySuggestions:
Evaluate whether the available ingredients can form at least one proper, satisfying meal on their own.
Show grocery suggestions in EITHER of these two cases:
1. Fewer than 5 distinct food items are visible, OR
2. The ingredients don't naturally work together for any proper meal (e.g. banana + hot sauce + rice + lemon = no cohesive dish)

If grocery suggestions are needed, suggest exactly 3 minimal grocery lists. Each suggestion must:
- Pick a popular, satisfying FOOD DISH (not a drink) the user is close to being able to make with what they have
- List only 2–4 essential items they need to BUY (not what they already have — keep it minimal)
- Include a warm, polite, encouraging message that:
  * Mentions what they already have by name
  * Tells them exactly what to buy
  * Ends with what delicious meal they'll be able to enjoy
  * Tone: friendly, warm, encouraging — like a helpful friend (e.g. "You already have eggs and butter — just pick up some flour and milk, and you'll be enjoying fluffy pancakes in no time! 🥞")
Format: array of objects with "dish", "buy" (array of strings), and "reason" (one warm sentence, max 25 words).
If the ingredients work well together for proper meals, set "grocerySuggestions" to an empty array [].

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
  "unavailableSuggestions": ["pizza", "sushi"],
  "grocerySuggestions": [
    { "dish": "Spaghetti Bolognese", "buy": ["spaghetti", "minced beef", "tomato paste"], "reason": "You already have onion and garlic — just grab these 3!" },
    { "dish": "Vegetable Stir-Fry", "buy": ["soy sauce", "bell peppers", "rice"], "reason": "Your eggs are perfect here — add these for a full meal." },
    { "dish": "Pancakes", "buy": ["flour", "milk", "sugar"], "reason": "You have eggs and butter — these 3 complete the batter!" }
  ]
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

    // Flag insufficient ingredients: all recipes have 2 or fewer ingredients
    const insufficientIngredients = normalised.every((r) => r.ingredients.length <= 2);

    // Grocery suggestions (only populated by AI when ingredients are very few)
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
