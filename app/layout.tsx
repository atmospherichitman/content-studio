import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dumb Down AI - Content Studio",
  description: "Your personal content creation machine",
};

const nav = [
  { href: "/", label: "🔥 Trends" },
  { href: "/script", label: "✍️ Script" },
  { href: "/teleprompter", label: "📺 Teleprompter" },
  { href: "/repurpose", label: "♻️ Repurpose" },
  { href: "/video", label: "🎬 Video" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-950 text-white min-h-screen" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <header className="border-b border-gray-800 px-4 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="text-lg font-bold text-white">⚡ Content Studio</div>
            <nav className="flex gap-1 overflow-x-auto">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
