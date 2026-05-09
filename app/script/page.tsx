"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ScriptPageInner() {
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [script, setScript] = useState("");
  const [hook, setHook] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateScript() {
    if (!topic.trim()) return;
    setLoading(true);
    setScript("");
    const res = await fetch("/api/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json();
    setScript(data.script || "");
    setHook(data.hook || "");
    setWordCount(data.wordCount || 0);
    setLoading(false);
  }

  function copyScript() {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">✍️ Script Generator</h1>
      <p className="text-gray-400 mb-8">
        Write a 60-second video script in your voice. Powered by your Brand Blueprint.
      </p>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateScript()}
          placeholder="e.g. How to make $500/month using ChatGPT"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={generateScript}
          disabled={loading || !topic.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap"
        >
          {loading ? "Writing..." : "Generate Script"}
        </button>
      </div>

      {script && (
        <div className="space-y-4">
          {hook && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
              <div className="text-xs text-blue-400 font-semibold mb-1 uppercase tracking-wide">Hook</div>
              <div className="text-blue-200">&ldquo;{hook}&rdquo;</div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                Script {wordCount > 0 && `· ${wordCount} words · ~${Math.round(wordCount / 2.5)}s`}
              </div>
              <button
                onClick={copyScript}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full bg-transparent text-gray-200 leading-relaxed resize-none focus:outline-none min-h-48"
              rows={10}
            />
          </div>

          <div className="flex gap-3">
            <Link
              href={`/teleprompter?script=${encodeURIComponent(script)}`}
              className="flex-1 text-center bg-green-700 hover:bg-green-600 px-4 py-3 rounded-xl font-semibold transition-colors"
            >
              📺 Open Teleprompter
            </Link>
            <Link
              href={`/repurpose?script=${encodeURIComponent(script)}`}
              className="flex-1 text-center bg-purple-700 hover:bg-purple-600 px-4 py-3 rounded-xl font-semibold transition-colors"
            >
              ♻️ Repurpose
            </Link>
            <Link
              href={`/video?script=${encodeURIComponent(script)}`}
              className="flex-1 text-center bg-orange-700 hover:bg-orange-600 px-4 py-3 rounded-xl font-semibold transition-colors"
            >
              🎬 Make Video
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScriptPage() {
  return (
    <Suspense>
      <ScriptPageInner />
    </Suspense>
  );
}
