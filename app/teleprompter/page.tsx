"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function TeleprompterInner() {
  const searchParams = useSearchParams();
  const [script, setScript] = useState(searchParams.get("script") || "");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [fontSize, setFontSize] = useState(48);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed * 0.5;
        }
      }, 16);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, speed]);

  function reset() {
    setRunning(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-hidden px-16 py-24"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
        >
          <div className="text-white font-bold whitespace-pre-wrap pb-96">
            {script}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 p-6 bg-black/80 border-t border-gray-800">
          <button
            onClick={() => setRunning(!running)}
            className={`px-8 py-4 rounded-xl font-bold text-xl ${running ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
          >
            {running ? "⏸ Pause" : "▶ Start"}
          </button>
          <button onClick={reset} className="px-6 py-4 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold">↺ Reset</button>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Speed</span>
            <input type="range" min={1} max={8} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-32" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Size</span>
            <input type="range" min={28} max={80} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-32" />
          </div>
          <button onClick={() => { setFullscreen(false); setRunning(false); }} className="px-6 py-4 rounded-xl bg-gray-700 hover:bg-gray-600">✕ Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">📺 Teleprompter</h1>
      <p className="text-gray-400 mb-8">Paste your script, hit fullscreen, and record.</p>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste your script here..."
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 min-h-48 mb-4 leading-relaxed"
        rows={10}
      />

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Speed</span>
          <input type="range" min={1} max={8} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-28" />
          <span className="text-gray-500 text-sm">{speed}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Font size</span>
          <input type="range" min={28} max={80} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-28" />
          <span className="text-gray-500 text-sm">{fontSize}px</span>
        </div>
      </div>

      <button
        onClick={() => { setFullscreen(true); setRunning(false); }}
        disabled={!script.trim()}
        className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
      >
        📺 Go Fullscreen — Start Recording
      </button>
    </div>
  );
}

export default function TeleprompterPage() {
  return (
    <Suspense>
      <TeleprompterInner />
    </Suspense>
  );
}
