export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!;
const CREATOMATE_BASE = "https://api.creatomate.com/v1";

async function uploadAudioToCreatomate(audioBase64: string): Promise<string> {
  const binary = Buffer.from(audioBase64, "base64");
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([binary], { type: "audio/mpeg" }),
    `audio-${Date.now()}.mp3`
  );
  const res = await fetch(`${CREATOMATE_BASE}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CREATOMATE_API_KEY}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Creatomate upload failed: ${err}`);
  }
  const data = await res.json();
  const url = data.url || (Array.isArray(data) ? data[0]?.url : null);
  if (!url) throw new Error(`No URL in Creatomate upload response: ${JSON.stringify(data)}`);
  return url;
}

async function submitRender(template: object): Promise<{ renderId?: string; error?: string }> {
  const res = await fetch(`${CREATOMATE_BASE}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CREATOMATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: template }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.hint || data.message || JSON.stringify(data) };
  }
  const renderId = Array.isArray(data) ? data[0]?.id : data?.id;
  if (!renderId) return { error: `No render ID returned: ${JSON.stringify(data)}` };
  return { renderId };
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, audioBase64, audioUrl, heygenVideoUrl, duration } = await req.json();

    if (!imageUrls || (!audioBase64 && !audioUrl)) {
      return NextResponse.json({ error: "imageUrls and audio are required" }, { status: 400 });
    }

    const perImageDuration = 3;
    const totalDuration = (duration && duration > 0) ? duration : imageUrls.length * perImageDuration;

    // Upload audio to Creatomate CDN - it cannot handle data URIs
    let audioSource: string;
    if (audioUrl) {
      audioSource = audioUrl; // Vercel Blob URL if available
    } else if (audioBase64) {
      audioSource = await uploadAudioToCreatomate(audioBase64); // Upload to Creatomate CDN
    } else {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // Build image slideshow for top half
    const imageElements = imageUrls.map((url: string, i: number) => ({
      type: "image",
      track: 1,
      time: i * perImageDuration,
      duration: perImageDuration,
      x: "50%",
      y: "25%",
      width: "100%",
      height: "50%",
      source: url,
      fit: "cover",
    }));

    // Audio track
    const audioElement = {
      type: "audio",
      track: 3,
      time: 0,
      source: audioSource,
    };

    let template: object;

    if (heygenVideoUrl) {
      // Split-screen: images top, avatar bottom
      template = {
        output_format: "mp4",
        width: 1080,
        height: 1920,
        duration: totalDuration,
        elements: [
          ...imageElements,
          {
            type: "video",
            track: 2,
            time: 0,
            duration: totalDuration,
            x: "50%",
            y: "75%",
            width: "100%",
            height: "50%",
            source: heygenVideoUrl,
            fit: "cover",
            volume: "0%",
          },
          audioElement,
        ],
      };
    } else {
      // Faceless mode: full-frame image slideshow + audio
      const facelessImages = imageUrls.map((url: string, i: number) => ({
        type: "image",
        track: 1,
        time: i * perImageDuration,
        duration: perImageDuration,
        x: "50%",
        y: "50%",
        width: "100%",
        height: "100%",
        source: url,
        fit: "cover",
      }));
      template = {
        output_format: "mp4",
        width: 1080,
        height: 1920,
        duration: totalDuration,
        elements: [...facelessImages, audioElement],
      };
    }

    // Submit with up to 2 retries
    let result = await submitRender(template);
    if (result.error) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await submitRender(template);
    }
    if (result.error) {
      await new Promise((r) => setTimeout(r, 4000));
      result = await submitRender(template);
    }

    if (result.error) {
      return NextResponse.json({ error: `Creatomate error: ${result.error}` }, { status: 500 });
    }

    return NextResponse.json({ renderId: result.renderId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const res = await fetch(`${CREATOMATE_BASE}/renders/${id}`, {
      headers: { Authorization: `Bearer ${CREATOMATE_API_KEY}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: JSON.stringify(data) }, { status: 500 });
    }

    return NextResponse.json({
      status: data.status || "planned",
      url: data.url || null,
      errorMessage: data.error_message || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
