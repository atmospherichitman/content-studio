"use client";
import { useState } from "react";

interface Trend {
  title: string;
  hook: string;
  why: string;
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchTrends() {
    setLoading(true);
    setTrends([]);
    const res = await fetch("/api/trends");
    const data = await res.json();
    setTrends(data.trends || []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🔥 Trending Topics</h1>
      <p className="text-gray-400 mb-8">
        Find what&apos;s blowing up in AI and make-money content right now.
      </p>

      <button
        onClick={fetchTrends}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors mb-8"
      >
        {loading ? "Finding trends..." : "Find Trending Topics"}
      </button>

      {trends.length > 0 && (
        <div className="space-y-4">
          {trends.map((t, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-bold text-lg mb-1">{t.title}</h2>
                  <p className="text-blue-400 text-sm mb-2 italic">&ldquo;{t.hook}&rdquo;</p>
                  <p className="text-gray-400 text-sm">{t.why}</p>
                </div>
                <a
                  href={`/script?topic=${encodeURIComponent(t.title)}`}
                  className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
                >
                  Write Script →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
