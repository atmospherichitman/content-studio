"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type StepStatus = "idle" | "loading" | "done" | "error" | "skipped";

interface Step {
  id: string;
  emoji: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

function ReelInner() {
  const searchParams = useSearchParams();
  const [script, setScript] = useState(searchParams.get("script") || "");
  const [facelessMode, setFacelessMode] = useState(false);
  const [building, setBuilding] = useState(false);
  const [finalUrl, setFinalUrl] = useState("");

  const initSteps = (faceless: boolean): Step[] => [
    { id: "images", emoji: "🖼️", label: "Generating Images", status: "idle" },
    { id: "audio", emoji: "🎙️", label: "Generating Audio", status: "idle" },
    { id: "avatar", emoji: "🎬", label: "Generating Avatar Video", status: faceless ? "skipped" : "idle" },
    { id: "assemble", emoji: "🎞️", label: "Assembling Reel", status: "idle" },
  ];

  const [steps, setSteps] = useState<Step[]>(initSteps(false));

  function setStep(id: string, update: Partial<Step>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }

  async function buildReel() {
    if (!script.trim()) return;
    setBuilding(true);
    setFinalUrl("");
    setSteps(initSteps(facelessMode));

    let imageUrls: string[] = [];
    let audioBase64 = "";
    let heygenVideoUrl = "";

    // Images + audio in parallel
    setStep("images", { status: "loading" });
    setStep("audio", { status: "loading" });
    if (!facelessMode) setStep("avatar", { status: "loading" });

    const parallelJobs: Promise<unknown>[] = [
      fetch("/api/reel/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      }).then((r) => r.json()),
      fetch("/api/reel/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      }).then((r) => r.json()),
    ];

    if (!facelessMode) {
      parallelJobs.push(
        fetch("/api/reel/heygen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script }),
        }).then((r) => r.json())
      );
    }

    const results = await Promise.allSettled(parallelJobs);

    // Images
    const imgResult = results[0];
    if (imgResult.status === "fulfilled" && (imgResult.value as { images?: string[] }).images) {
      imageUrls = (imgResult.value as { images: string[] }).images;
      setStep("images", { status: "done", detail: `${imageUrls.length} images ready` });
    } else {
      const err = imgResult.status === "rejected" ? imgResult.reason?.message : (imgResult.value as { error?: string }).error;
      setStep("images", { status: "error", detail: err || "Failed to generate images" });
    }

    // Audio
    const audioResult = results[1];
    if (audioResult.status === "fulfilled" && (audioResult.value as { audioBase64?: string }).audioBase64) {
      audioBase64 = (audioResult.value as { audioBase64: string }).audioBase64;
      setStep("audio", { status: "done", detail: "Audio ready" });
    } else {
      const err = audioResult.status === "rejected" ? audioResult.reason?.message : (audioResult.value as { error?: string }).error;
      setStep("audio", { status: "error", detail: err || "Failed to generate audio" });
    }

    // HeyGen (if not faceless)
    if (!facelessMode && results[2]) {
      const heygenResult = results[2];
      if (heygenResult.status === "fulfilled" && (heygenResult.value as { videoId?: string }).videoId) {
        const videoId = (heygenResult.value as { videoId: string }).videoId;
        setStep("avatar", { status: "loading", detail: "Rendering... (3-10 min)" });

        heygenVideoUrl = await new Promise((resolve) => {
          const interval = setInterval(async () => {
            try {
              const res = await fetch(`/api/reel/heygen?id=${videoId}`);
              const data = await res.json() as { status?: string; videoUrl?: string };
              if (data.status === "completed" && data.videoUrl) {
                clearInterval(interval);
                setStep("avatar", { status: "done", detail: "Avatar video ready" });
                resolve(data.videoUrl);
              } else if (data.status === "failed") {
                clearInterval(interval);
                setStep("avatar", { status: "error", detail: "Avatar rendering failed" });
                resolve("");
              }
            } catch { /* keep polling */ }
          }, 10000);
        });
      } else {
        const err = heygenResult.status === "rejected" ? heygenResult.reason?.message : (heygenResult.value as { error?: string }).error;
        setStep("avatar", { status: "error", detail: err || "Failed to start avatar" });
      }
    }

    // Check we have what we need
    if (!imageUrls.length || !audioBase64) {
      setStep("assemble", { status: "error", detail: "Missing assets - check errors above" });
      setBuilding(false);
      return;
    }
    if (!facelessMode && !heygenVideoUrl) {
      setStep("assemble", { status: "error", detail: "Avatar video failed - try Faceless Mode" });
      setBuilding(false);
      return;
    }

    // Assemble
    setStep("assemble", { status: "loading", detail: "Submitting to Creatomate..." });

    try {
      const assembleRes = await fetch("/api/reel/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls,
          audioBase64,
          heygenVideoUrl: facelessMode ? "" : heygenVideoUrl,
          duration: 30,
        }),
      });
      const assembleData = await assembleRes.json() as { renderId?: string; error?: string };

      if (!assembleData.renderId) {
        setStep("assemble", { status: "error", detail: assembleData.error || "Failed to start render" });
        setBuilding(false);
        return;
      }

      const renderId = assembleData.renderId;
      setStep("assemble", { status: "loading", detail: "Rendering video... (1-5 min)" });

      await new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/reel/assemble?id=${renderId}`);
            const data = await res.json() as { status?: string; url?: string; errorMessage?: string };
            if (data.status === "succeeded" && data.url) {
              clearInterval(interval);
              setStep("assemble", { status: "done", detail: "Reel ready!" });
              setFinalUrl(data.url);
              resolve();
            } else if (data.status === "failed") {
              clearInterval(interval);
              setStep("assemble", { status: "error", detail: data.errorMessage || "Render failed" });
              resolve();
            }
          } catch { /* keep polling */ }
        }, 5000);
      });
    } catch (e: unknown) {
      setStep("assemble", { status: "error", detail: e instanceof Error ? e.message : "Unknown error" });
    }

    setBuilding(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">⚡ Reel Builder</h1>
      <p className="text-gray-400 mb-6">
        Split-screen reel: AI images on top, your avatar below. Theaisurfer style.
      </p>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste your script here..."
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 mb-4 leading-relaxed"
        rows={6}
        disabled={building}
      />

      {/* Faceless mode toggle */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setFacelessMode(!facelessMode)}
          disabled={building}
          className={`relative w-12 h-6 rounded-full transition-colors ${facelessMode ? "bg-orange-600" : "bg-gray-700"}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${facelessMode ? "left-7" : "left-1"}`} />
        </button>
        <span className="text-sm text-gray-400">
          <span className="text-white font-medium">Faceless Mode</span> - skip avatar, faster render
        </span>
      </div>

      <button
        onClick={buildReel}
        disabled={building || !script.trim()}
        className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold text-lg transition-all mb-8"
      >
        {building ? "Building Reel..." : "⚡ Build Reel"}
      </button>

      {/* Steps */}
      {steps.some((s) => s.status !== "idle") && (
        <div className="space-y-3 mb-8">
          {steps.map((step) => (
            <div key={step.id} className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 ${
              step.status === "error" ? "border-red-800" :
              step.status === "done" ? "border-green-800" :
              step.status === "skipped" ? "border-gray-800 opacity-40" :
              "border-gray-800"
            }`}>
              <div className="text-2xl w-8 text-center flex-shrink-0">
                {step.status === "idle" && <span className="text-gray-600">{step.emoji}</span>}
                {step.status === "loading" && <span className="animate-pulse">{step.emoji}</span>}
                {step.status === "done" && <span>✅</span>}
                {step.status === "error" && <span>❌</span>}
                {step.status === "skipped" && <span className="text-gray-600">{step.emoji}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${
                  step.status === "idle" || step.status === "skipped" ? "text-gray-600" :
                  step.status === "loading" ? "text-white" :
                  step.status === "done" ? "text-green-400" : "text-red-400"
                }`}>
                  {step.label}{step.status === "skipped" ? " (skipped)" : ""}
                </div>
                {step.detail && (
                  <div className={`text-sm mt-0.5 ${step.status === "error" ? "text-red-400" : "text-gray-500"}`}>
                    {step.detail}
                  </div>
                )}
                {step.status === "loading" && (
                  <div className="h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-red-600 rounded-full animate-pulse w-2/3" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Final output */}
      {finalUrl && (
        <div className="bg-gray-900 border border-green-700 rounded-xl p-5">
          <div className="text-green-400 font-semibold text-lg mb-4">✅ Your Reel is Ready!</div>
          <video
            src={finalUrl}
            controls
            className="w-full max-w-sm mx-auto rounded-lg bg-black"
            style={{ maxHeight: "80vh" }}
          />
          <div className="mt-4 flex gap-3 justify-center flex-wrap">
            <a
              href={finalUrl}
              download="reel.mp4"
              className="bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Download Reel
            </a>
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReelPage() {
  return (
    <Suspense>
      <ReelInner />
    </Suspense>
  );
}
