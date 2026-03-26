# 🍽️ Pantry to Plate — AI Recipe Generator

> Drop a photo of your fridge. Get 3 instant, tiered recipes powered by Groq's blazing-fast Llama 4 Vision AI.

![Pantry to Plate](https://img.shields.io/badge/Built%20with-Next.js%2015-black?logo=next.js)
![Groq](https://img.shields.io/badge/Powered%20by-Groq%20AI-orange)
![License](https://img.shields.io/badge/License-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **Multi-image upload** | Drag & drop up to 10 fridge/pantry photos |
| 🔍 **Ingredient detection** | Scan & edit detected ingredients before generating |
| 🍳 **3-tier recipes** | Everyday · Impressive · Chef's Special |
| 🥗 **Nutritional info** | Calories, protein, carbs, fat, prep time per recipe |
| 💡 **Chef's tips** | Pro cooking tips on every recipe |
| 💾 **PDF export** | Download any recipe as a beautifully formatted PDF |
| 🔗 **Share links** | Share recipes with rich Open Graph preview cards |
| 👍 **Recipe ratings** | Visitors can rate shared recipes good/bad |
| 🕐 **History sidebar** | All past generations saved in localStorage |
| 🌙 **Dark mode** | Full dark/light theme with system preference detection |
| 🖨️ **Print styles** | Print-optimised layout for the recipe share page |

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/pantry-to-plate.git
cd pantry-to-plate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.local.template .env.local
```

Edit `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> Get your free Groq API key at **[console.groq.com](https://console.groq.com)**

### 4. Run the development server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 🏗️ Project Structure

```
pantry-to-plate/
├── app/
│   ├── page.tsx                        # Main upload + recipe generation page
│   ├── layout.tsx                      # Root layout with ThemeProvider
│   ├── globals.css                     # Tailwind + print styles
│   ├── api/
│   │   ├── generate/route.ts           # POST — generate recipes via Groq Vision
│   │   ├── detect-ingredients/route.ts # POST — detect ingredients from images
│   │   ├── rate/route.ts               # GET/POST — recipe ratings
│   │   └── og/route.tsx                # GET — Open Graph image generator (SVG)
│   ├── recipe/
│   │   └── [id]/
│   │       ├── page.tsx                # Shareable recipe page
│   │       └── layout.tsx              # Dynamic OG metadata
│   └── components/
│       ├── ThemeProvider.tsx           # Dark/light mode context
│       ├── ThemeToggle.tsx             # Sun/moon icon toggle button
│       ├── RecipeCard.tsx              # Recipe display card with PDF + share
│       ├── RecipeRating.tsx            # 👍/👎 rating widget
│       ├── IngredientPreview.tsx       # Ingredient scan/edit panel
│       └── HistorySidebar.tsx          # localStorage history sidebar
├── .env.local.template                 # Environment variable template
├── .gitignore                          # Git ignore rules
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 15** (App Router) | Full-stack React framework |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS** | Utility-first styling + dark mode |
| **Groq SDK** | Blazing-fast AI inference |
| **Llama 4 Scout** (Vision) | Ingredient detection + recipe generation |
| **react-dropzone** | Drag & drop file upload |
| **jsPDF** | Client-side PDF generation |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Your Groq API key from [console.groq.com](https://console.groq.com) |
| `UPSTASH_REDIS_REST_URL` | ⚡ Recommended | Upstash Redis REST URL from [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | ⚡ Recommended | Upstash Redis REST token |

> **Note:** If Upstash vars are not set, recipe ratings fall back to an in-memory store (resets on server restart). For persistent ratings across deployments, set up a free Upstash Redis database.

---

## 🗄️ Setting Up Upstash Redis (Free)

1. Go to **[console.upstash.com](https://console.upstash.com)** and sign up free
2. Click **"Create Database"**
3. Choose a name (e.g. `pantry-to-plate`), pick the region closest to your users
4. Select **"Serverless"** type → **Create**
5. Copy the **REST URL** and **REST Token** from the database dashboard
6. Add to your `.env.local`:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXxx...
   ```
7. On Vercel: add both vars in **Settings → Environment Variables**

### How ratings are stored in Redis
Each recipe gets a Redis hash key based on a SHA-256 of its title:
```
ptp:rating:<16-char-hash>  →  { good: "12", bad: "3" }
```
Votes are incremented atomically with `HINCRBY` — safe for concurrent requests. Keys expire after 1 year automatically.

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add `GROQ_API_KEY` in Vercel → Settings → Environment Variables
4. Deploy!

---

## ⚠️ Important Notes

- **Image size limit:** Each uploaded image must be under **5 MB**
- **Max images:** Up to **10 photos** per generation
- **Scanned/image PDFs:** Text extraction only works on text-layer PDFs
- **Ratings storage:** Recipe ratings use in-memory storage (resets on server restart). For production, integrate a persistent database (Upstash Redis, Supabase, etc.)
- **Share links:** Recipe data is encoded in the URL hash — no server storage needed

---

## 📄 License

MIT © 2026 — Built with ❤️ using Next.js + Groq AI
