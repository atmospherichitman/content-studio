export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY!;
const CREATOMATE_BASE = "https://api.creatomate.com/v1";

async function uploadAudioToCreatomate(audioBase64: string): Promise<string | null> {
  try {
    const binary = Buffer.from(audioBase64, "base64");
    const res = await fetch(`${CREATOMATE_BASE}/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "audio/mpeg",
        "Content-Length": binary.length.toString(),
      },
      body: binary,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
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
    const { imageUrls, audioBase64, heygenVideoUrl, duration } = await req.json();

    if (!imageUrls || !audioBase64) {
      return NextResponse.json({ error: "imageUrls and audioBase64 are required" }, { status: 400 });
    }

    const perImageDuration = 3;
    const totalDuration = (duration && duration > 0) ? duration : imageUrls.length * perImageDuration;

    // Try to get a hosted audio URL (more reliable than data URI)
    const hostedAudioUrl = await uploadAudioToCreatomate(audioBase64);
    const audioSource = hostedAudioUrl || `data:audio/mpeg;base64,${audioBase64}`;

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
