import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Pantry to Plate — AI Recipe Generator",
  description:
    "Drop a photo of your fridge and get 3 instant AI-powered recipes using only what you have.",
  keywords: ["recipe generator", "AI chef", "fridge to recipe", "Groq", "vision AI"],
  openGraph: {
    title: "Pantry to Plate",
    description: "Drop a fridge photo → get 3 instant recipes with AI.",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pantry to Plate",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans transition-colors duration-300">
        {/* PWA theme color */}
        <meta name="theme-color" content="#f97316" />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
