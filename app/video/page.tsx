"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VideoInner() {
  const searchParams = useSearchParams();
  const [script, setScript] = useState(searchParams.get("script") || "");
  const [videoId, setVideoId] = useState("");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  async function generateVideo() {
    if (!script.trim()) return;
    setLoading(true);
    setVideoId("");
    setStatus("");
    setVideoUrl("");
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });
    const data = await res.json();
    if (data.videoId) {
      setVideoId(data.videoId);
      setStatus("processing");
      setPolling(true);
    } else {
      setStatus("error");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!polling || !videoId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/video?id=${videoId}`);
      const data = await res.json();
      setStatus(data.status || "processing");
      if (data.status === "completed" && data.video_url) {
        setVideoUrl(data.video_url);
        setPolling(false);
      } else if (data.status === "failed") {
        setPolling(false);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [polling, videoId]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🎬 Generate Video</h1>
      <p className="text-gray-400 mb-2">
        Your HeyGen avatar reads the script. No camera needed.
      </p>
      <p className="text-xs text-gray-600 mb-8">Using your personal avatar + voice. Videos take 3-10 minutes to render.</p>

      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Paste your script here..."
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 leading-relaxed"
        rows={8}
      />

      <button
        onClick={generateVideo}
        disabled={loading || !script.trim() || polling}
        className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition-colors mb-8"
      >
        {loading ? "Sending to HeyGen..." : polling ? "Rendering..." : "Generate Avatar Video"}
      </button>

      {status && !videoUrl && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          {status === "processing" || status === "pending" ? (
            <div>
              <div className="text-2xl mb-2 animate-pulse">🎬</div>
              <div className="text-gray-300 font-semibold">Rendering your video...</div>
              <div className="text-gray-500 text-sm mt-1">Usually takes 3-10 minutes. This page auto-refreshes.</div>
              {videoId && <div className="text-gray-600 text-xs mt-3">Video ID: {videoId}</div>}
            </div>
          ) : status === "failed" ? (
            <div className="text-red-400">Video generation failed. Try again.</div>
          ) : (
            <div className="text-gray-400">{status}</div>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="bg-gray-900 border border-green-700 rounded-xl p-5">
          <div className="text-green-400 font-semibold mb-4">✅ Video Ready!</div>
          <video src={videoUrl} controls className="w-full rounded-lg max-h-96 bg-black" />
          <a
            href={videoUrl}
            download
            className="mt-4 inline-block bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense>
      <VideoInner />
    </Suspense>
  );
}
