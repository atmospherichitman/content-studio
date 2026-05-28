"use client";
import { useState } from "react";

const NICHES = [
  { id: "make-money", label: "💰 Make Money with AI" },
  { id: "ai-tools", label: "🤖 AI Tools" },
  { id: "productivity", label: "⚡ Productivity" },
  { id: "side-hustle", label: "🚀 Side Hustle" },
];

type Day = { day: number; topic: string; hook: string; script: string; type: string };

export default function ContentEnginePage() {
  const [niche, setNiche] = useState("make-money");
  const [hooks, setHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState("");
  const [script, setScript] = useState("");
  const [caption, setCaption] = useState("");
  const [calendar, setCalendar] = useState<Day[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  function setLoad(k: string, v: boolean) { setLoading((p) => ({ ...p, [k]: v })); }

  async function call(action: string, extra: object = {}) {
    const res = await fetch("/api/content-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, niche, ...extra }),
    });
    return res.json();
  }

  async function getHooks() {
    setLoad("hooks", true);
    setHooks([]);
    setSelectedHook("");
    setScript("");
    const data = await call("hooks");
    setHooks(data.hooks || []);
    setLoad("hooks", false);
  }

  async function getScript(hook: string) {
    setSelectedHook(hook);
    setLoad("script", true);
    setScript("");
    setCaption("");
    const data = await call("script", { hook });
    setScript(data.script || "");
    setLoad("script", false);
  }

  async function getCaption() {
    if (!script) return;
    setLoad("caption", true);
    const data = await call("caption", { script });
    setCaption(data.caption || "");
    setLoad("caption", false);
  }

  async function getCalendar() {
    setLoad("calendar", true);
    setCalendar([]);
    const data = await call("calendar");
    setCalendar(data.days || []);
    setLoad("calendar", false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🧠 Content Engine</h1>
      <p className="text-gray-400 mb-8">Hooks, scripts, captions, and a 7-day calendar. All in one place.</p>

      {/* Niche selector */}
      <div className="mb-8">
        <div className="text-sm text-gray-500 mb-3 uppercase tracking-wide">Your Niche</div>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <button
              key={n.id}
              onClick={() => setNiche(n.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                niche === n.id
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Hooks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-lg">Step 1 - Hook Ideas</div>
            <div className="text-gray-500 text-sm">3 scroll-stopping openers</div>
          </div>
          <button
            onClick={getHooks}
            disabled={loading.hooks}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading.hooks ? "Generating..." : "Get Hooks"}
          </button>
        </div>
        {hooks.length > 0 && (
          <div className="space-y-2">
            {hooks.map((h, i) => (
              <div
                key={i}
                onClick={() => getScript(h)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  selectedHook === h
                    ? "border-orange-600 bg-orange-950"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <div className="text-sm">"{h}"</div>
                {selectedHook !== h && (
                  <div className="text-xs text-orange-500 mt-1">Click to write script</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Script */}
      {(selectedHook || script) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <div className="font-bold text-lg mb-1">Step 2 - Script</div>
          <div className="text-gray-500 text-sm mb-4">30-second, 3-act structure</div>
          {loading.script ? (
            <div className="text-gray-500 animate-pulse">Writing script...</div>
          ) : script ? (
            <>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm leading-relaxed focus:outline-none focus:border-orange-500 mb-3"
                rows={6}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={getCaption}
                  disabled={loading.caption}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {loading.caption ? "Writing..." : "Generate Caption"}
                </button>
                <a
                  href={`/reel?script=${encodeURIComponent(script)}`}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  ⚡ Build Reel
                </a>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Caption */}
      {caption && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <div className="font-bold text-lg mb-3">Step 3 - Instagram Caption</div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{caption}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(caption)}
            className="mt-3 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Copy Caption
          </button>
        </div>
      )}

      {/* 7-day calendar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-lg">7-Day Content Calendar</div>
            <div className="text-gray-500 text-sm">A full week of reel ideas</div>
          </div>
          <button
            onClick={getCalendar}
            disabled={loading.calendar}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading.calendar ? "Building..." : "Generate Calendar"}
          </button>
        </div>

        {loading.calendar && (
          <div className="text-gray-500 animate-pulse">Building your 7-day plan...</div>
        )}

        {calendar.length > 0 && (
          <>
            <div className="space-y-2">
              {calendar.map((day) => (
                <div key={day.day} className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-orange-500 font-bold text-sm">Day {day.day}</span>
                      <span className="text-white text-sm">{day.topic}</span>
                      <span className="text-gray-600 text-xs bg-gray-800 px-2 py-0.5 rounded">{day.type}</span>
                    </div>
                    <span className="text-gray-500">{expandedDay === day.day ? "▲" : "▼"}</span>
                  </button>
                  {expandedDay === day.day && (
                    <div className="px-4 pb-4 bg-gray-850">
                      <div className="text-xs text-orange-400 mb-1">Hook</div>
                      <div className="text-sm text-gray-300 mb-3 italic">"{day.hook}"</div>
                      <div className="text-xs text-orange-400 mb-1">Script</div>
                      <div className="text-sm text-gray-300 mb-3">{day.script}</div>
                      <a
                        href={`/reel?script=${encodeURIComponent(day.script)}`}
                        className="inline-block bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      >
                        ⚡ Build Reel
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(calendar, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "content-calendar.json";
                a.click();
              }}
              className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Export JSON
            </button>
          </>
        )}
      </div>
    </div>
  );
}
