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
| 🥦 **Dietary filters** | Vegetarian, Vegan, Gluten-Free, Dairy-Free, Keto, Halal, Low-Calorie |
| 🔄 **Ingredient substitutions** | Tap any ingredient → get 3 AI-powered substitutes instantly |
| 📱 **PWA support** | Install as a native app on mobile/desktop — orange branded icons |
| 📊 **Vercel Analytics** | Page view and visitor tracking built-in |

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
│   ├── layout.tsx                      # Root layout with ThemeProvider + PWA meta
│   ├── globals.css                     # Tailwind + print styles
│   ├── api/
│   │   ├── generate/route.ts           # POST — generate recipes via Groq Vision
│   │   ├── detect-ingredients/route.ts # POST — detect ingredients from images
│   │   ├── rate/route.ts               # GET/POST — recipe ratings (Upstash Redis)
│   │   ├── substitute/route.ts         # POST — ingredient substitutions via Groq
│   │   └── og/route.tsx                # GET — Open Graph image generator (SVG)
│   ├── recipe/
│   │   ├── share/
│   │   │   ├── page.tsx                # Shareable recipe page (dynamic OG metadata)
│   │   │   └── layout.tsx              # Static layout wrapper
│   │   └── [id]/
│   │       ├── page.tsx                # Legacy shareable recipe page
│   │       └── layout.tsx              # Static layout wrapper
│   └── components/
│       ├── ThemeProvider.tsx           # Dark/light mode context + localStorage
│       ├── ThemeToggle.tsx             # Sun/moon icon toggle button
│       ├── RecipeCard.tsx              # Recipe card with substitutions, rating, PDF & share
│       ├── RecipeRating.tsx            # 👍/👎 rating widget with progress bars
│       ├── RecipeShareClient.tsx       # Client-side share page component
│       ├── IngredientPreview.tsx       # Ingredient scan/edit panel
│       ├── DietaryFilters.tsx          # 7 dietary preference toggle filters
│       └── HistorySidebar.tsx          # localStorage history sidebar
├── public/
│   ├── manifest.json                   # PWA manifest (name, icons, theme color)
│   └── icons/
│       ├── icon-192.svg                # PWA icon 192×192
│       └── icon-512.svg                # PWA icon 512×512
├── .env.local.template                 # Environment variable template
├── .gitignore                          # Git ignore rules
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** (App Router) | 15.1.0 | Full-stack React framework — handles routing, API routes, SSR metadata |
| **React** | 19.0.0 | UI component library |
| **TypeScript** | 5.7 | Type safety — shared types across frontend and API routes |
| **Tailwind CSS** | 3.4 | Utility-first styling with built-in dark mode (`darkMode: "class"`) |
| **Groq SDK** | 0.7.0 | Client for Groq's ultra-fast AI inference API |
| **Llama 4 Scout** (Vision) | — | Multimodal AI model — sees images, detects ingredients, generates recipes |
| **react-dropzone** | 14.3.5 | Drag & drop file upload with file type/multiple file support |
| **jsPDF** | 2.5.1 | Client-side PDF generation — no server needed |
| **@upstash/redis** | 1.34.3 | Serverless Redis client — persistent recipe ratings via REST API |
| **@vercel/analytics** | 1.5.0 | Page view tracking via Vercel Analytics dashboard |

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

- **Image size limit:** Each uploaded image must be under **5 MB** — oversized files are rejected with a clear error message
- **Max images:** Up to **10 photos** per generation — AI combines ingredients from all photos
- **Ratings storage:** Uses **Upstash Redis** for persistence. Falls back to in-memory if env vars not set
- **Share links:** Recipe data is Base64-encoded in the URL hash — no server storage needed, works instantly
- **Share page:** Share links open `/recipe/share?title=...#recipe=...` — includes OG metadata for rich social previews
- **Dark mode:** Respects system preference on first visit, saved to `localStorage` for returning users
- **PDF export:** Generated entirely in the browser via jsPDF — no server round-trip needed

---

## 📄 License

MIT © 2026 — Built with ❤️ using Next.js + Groq AI
