import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

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
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-8">
          <div className="text-xl font-bold text-white">⚡ Content Studio</div>
          <nav className="flex gap-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
