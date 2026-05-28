export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY;
const CREATOMATE_BASE = "https://api.creatomate.com/v1";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, audioBase64, heygenVideoUrl, duration } = await req.json();

    if (!imageUrls || !audioBase64 || !heygenVideoUrl || !duration) {
      return NextResponse.json({ error: "imageUrls, audioBase64, heygenVideoUrl, and duration are required" }, { status: 400 });
    }

    // 3 seconds per image, 10 images = 30 seconds total
    const perImageDuration = 3;
    const totalDuration = imageUrls.length * perImageDuration;

    // Build image slideshow for the top half (y:25% = center of top 50%)
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

    // Bottom half: HeyGen avatar video (y:75% = center of bottom 50%), mute its audio
    const avatarElement = {
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
    };

    // Audio: ElevenLabs voiceover as base64 data URL
    const audioElement = {
      type: "audio",
      track: 3,
      time: 0,
      source: `data:audio/mpeg;base64,${audioBase64}`,
    };

    const template = {
      output_format: "mp4",
      width: 1080,
      height: 1920,
      duration: totalDuration,
      elements: [...imageElements, avatarElement, audioElement],
    };

    const response = await fetch(`${CREATOMATE_BASE}/renders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: template }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Creatomate error: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    // Creatomate returns an array of renders
    const renderId = Array.isArray(data) ? data[0]?.id : data?.id;
    if (!renderId) {
      return NextResponse.json(
        { error: `No render ID in Creatomate response: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ renderId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const response = await fetch(`${CREATOMATE_BASE}/renders/${id}`, {
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Creatomate status error: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    const status = data.status || "planned";
    const url = data.url;
    const errorMessage = data.error_message || data.error || null;

    return NextResponse.json({ status, url, errorMessage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
