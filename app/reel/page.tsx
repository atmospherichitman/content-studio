"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type StepStatus = "idle" | "loading" | "done" | "error";

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
  const [building, setBuilding] = useState(false);
  const [finalUrl, setFinalUrl] = useState("");

  const [steps, setSteps] = useState<Step[]>([
    { id: "images", emoji: "🖼️", label: "Generating Images", status: "idle" },
    { id: "audio", emoji: "🎙️", label: "Generating Audio", status: "idle" },
    { id: "avatar", emoji: "🎬", label: "Generating Avatar Video", status: "idle" },
    { id: "assemble", emoji: "🎞️", label: "Assembling Reel", status: "idle" },
  ]);

  function setStep(id: string, update: Partial<Step>) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...update } : s))
    );
  }

  async function buildReel() {
    if (!script.trim()) return;
    setBuilding(true);
    setFinalUrl("");
    setSteps([
      { id: "images", emoji: "🖼️", label: "Generating Images", status: "idle" },
      { id: "audio", emoji: "🎙️", label: "Generating Audio", status: "idle" },
      { id: "avatar", emoji: "🎬", label: "Generating Avatar Video", status: "idle" },
      { id: "assemble", emoji: "🎞️", label: "Assembling Reel", status: "idle" },
    ]);

    // Start images, audio, and avatar all in parallel
    setStep("images", { status: "loading" });
    setStep("audio", { status: "loading" });
    setStep("avatar", { status: "loading" });

    let imageUrls: string[] = [];
    let audioBase64 = "";
    let heygenVideoUrl = "";

    // Run images + audio in parallel
    const [imagesResult, audioResult] = await Promise.allSettled([
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
    ]);

    if (imagesResult.status === "fulfilled" && imagesResult.value.images) {
      imageUrls = imagesResult.value.images;
      setStep("images", { status: "done", detail: `${imageUrls.length} images ready` });
    } else {
      const err = imagesResult.status === "rejected"
        ? imagesResult.reason?.message
        : imagesResult.value?.error;
      setStep("images", { status: "error", detail: err || "Failed to generate images" });
    }

    if (audioResult.status === "fulfilled" && audioResult.value.audioBase64) {
      audioBase64 = audioResult.value.audioBase64;
      setStep("audio", { status: "done", detail: "Audio ready" });
    } else {
      const err = audioResult.status === "rejected"
        ? audioResult.reason?.message
        : audioResult.value?.error;
      setStep("audio", { status: "error", detail: err || "Failed to generate audio" });
    }

    // Start HeyGen avatar generation (POST)
    let videoId = "";
    try {
      const heygenPost = await fetch("/api/reel/heygen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const heygenData = await heygenPost.json();
      if (heygenData.videoId) {
        videoId = heygenData.videoId;
        setStep("avatar", { status: "loading", detail: "Rendering... (3-10 min)" });
      } else {
        setStep("avatar", { status: "error", detail: heygenData.error || "Failed to start avatar video" });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStep("avatar", { status: "error", detail: msg });
    }

    // Poll HeyGen until done
    if (videoId) {
      heygenVideoUrl = await new Promise((resolve) => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/reel/heygen?id=${videoId}`);
            const data = await res.json();
            if (data.status === "completed" && data.videoUrl) {
              clearInterval(interval);
              setStep("avatar", { status: "done", detail: "Avatar video ready" });
              resolve(data.videoUrl);
            } else if (data.status === "failed") {
              clearInterval(interval);
              setStep("avatar", { status: "error", detail: "Avatar video rendering failed" });
              resolve("");
            }
            // else keep polling
          } catch {
            // network blip, keep polling
          }
        }, 10000);
      });
    }

    // Check if we have everything needed to assemble
    if (!imageUrls.length || !audioBase64 || !heygenVideoUrl) {
      setStep("assemble", { status: "error", detail: "Missing required assets - check errors above" });
      setBuilding(false);
      return;
    }

    // Assemble the reel
    setStep("assemble", { status: "loading", detail: "Submitting to Creatomate..." });

    try {
      const assembleRes = await fetch("/api/reel/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls,
          audioBase64,
          heygenVideoUrl,
          duration: 60, // estimate; Creatomate will determine final length
        }),
      });
      const assembleData = await assembleRes.json();

      if (!assembleData.renderId) {
        setStep("assemble", { status: "error", detail: assembleData.error || "Failed to start render" });
        setBuilding(false);
        return;
      }

      const renderId = assembleData.renderId;
      setStep("assemble", { status: "loading", detail: "Rendering video (1-5 min)..." });

      // Poll Creatomate render status
      await new Promise<void>((resolve) => {
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/reel/assemble?id=${renderId}`);
            const data = await res.json();
            if (data.status === "succeeded" && data.url) {
              clearInterval(interval);
              setStep("assemble", { status: "done", detail: "Reel ready!" });
              setFinalUrl(data.url);
              resolve();
            } else if (data.status === "failed") {
              clearInterval(interval);
              setStep("assemble", { status: "error", detail: "Creatomate render failed" });
              resolve();
            }
            // planned/rendering - keep polling
          } catch {
            // keep polling on network blips
          }
        }, 5000);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStep("assemble", { status: "error", detail: msg });
    }

    setBuilding(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">⚡ Reel Builder</h1>
      <p className="text-gray-400 mb-2">
        Build a split-screen reel: AI comic images on top, your avatar below.
      </p>
      <p className="text-xs text-gray-600 mb-8">
        Powered by DALL-E 3 + ElevenLabs + HeyGen + Creatomate. Takes 5-15 minutes total.
      </p>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste your script here..."
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 mb-4 leading-relaxed"
        rows={8}
        disabled={building}
      />

      <button
        onClick={buildReel}
        disabled={building || !script.trim()}
        className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl font-bold text-lg transition-all mb-8"
      >
        {building ? "Building Reel..." : "⚡ Build Reel"}
      </button>

      {/* Step cards */}
      {steps.some((s) => s.status !== "idle") && (
        <div className="space-y-3 mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="text-2xl w-8 text-center flex-shrink-0">
                {step.status === "idle" && (
                  <span className="text-gray-600">{step.emoji}</span>
                )}
                {step.status === "loading" && (
                  <span className="animate-pulse">{step.emoji}</span>
                )}
                {step.status === "done" && <span>✅</span>}
                {step.status === "error" && <span>❌</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold ${
                    step.status === "idle"
                      ? "text-gray-600"
                      : step.status === "loading"
                      ? "text-white"
                      : step.status === "done"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {step.label}
                </div>
                {step.detail && (
                  <div
                    className={`text-sm mt-0.5 ${
                      step.status === "error" ? "text-red-400" : "text-gray-500"
                    }`}
                  >
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
          <div className="text-green-400 font-semibold text-lg mb-4">
            ✅ Your Reel is Ready!
          </div>
          <video
            src={finalUrl}
            controls
            className="w-full max-w-sm mx-auto rounded-lg bg-black"
            style={{ maxHeight: "80vh" }}
          />
          <div className="mt-4 text-center">
            <a
              href={finalUrl}
              download="reel.mp4"
              className="inline-block bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Download Reel
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
