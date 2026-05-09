"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function RepurposeInner() {
  const searchParams = useSearchParams();
  const [script, setScript] = useState(searchParams.get("script") || "");
  const [result, setResult] = useState<{ instagram?: string; facebook?: string; xthread?: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function repurpose() {
    if (!script.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/repurpose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">♻️ Repurpose</h1>
      <p className="text-gray-400 mb-8">
        Turn your script into Instagram caption, Facebook post, and X thread — instantly.
      </p>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste your script here..."
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 leading-relaxed"
        rows={8}
      />

      <button
        onClick={repurpose}
        disabled={loading || !script.trim()}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors mb-8"
      >
        {loading ? "Repurposing..." : "Repurpose Content"}
      </button>

      {result && (
        <div className="space-y-6">
          {result.instagram && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-pink-400">📸 Instagram Caption</div>
                <CopyButton text={result.instagram} />
              </div>
              <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result.instagram}</pre>
            </div>
          )}

          {result.facebook && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-blue-400">👍 Facebook Post</div>
                <CopyButton text={result.facebook} />
              </div>
              <pre className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">{result.facebook}</pre>
            </div>
          )}

          {result.xthread && result.xthread.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-sky-400">𝕏 Thread</div>
                <CopyButton text={result.xthread.join("\n\n")} />
              </div>
              <div className="space-y-3">
                {result.xthread.map((tweet, i) => (
                  <div key={i} className="border border-gray-700 rounded-lg p-3 text-gray-200 text-sm leading-relaxed">
                    {tweet}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RepurposePage() {
  return (
    <Suspense>
      <RepurposeInner />
    </Suspense>
  );
}
