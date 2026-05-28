export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const EL_KEY = proces…EY!;
const EL_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
const MODELS = [
  "eleven_turbo_v2_5",
  "eleven_turbo_v2",
  "eleven_multilingual_v2",
  "eleven_monolingual_v1",
];

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) return NextResponse.json({ error: "script is required" }, { status: 400 });

    let audioBuffer: ArrayBuffer | null = null;
    let lastError = "";

    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
          {
            method: "POST",
            headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: script,
              model_id: model,
              voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3 },
            }),
          }
        );
        if (!res.ok) {
          lastError = `${model}: ${await res.text()}`;
          continue;
        }
        audioBuffer = await res.arrayBuffer();
        break;
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : "unknown"}`;
        continue;
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: `All ElevenLabs models failed. Last: ${lastError}` }, { status: 500 });
    }

    const base64 = Buffer.from(audioBuffer).toString("base64");

    // Try Vercel Blob for a hosted URL (bonus - assemble route will use if available)
    let audioUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`reel-audio-${Date.now()}.mp3`, Buffer.from(audioBuffer), {
          access: "public",
          contentType: "audio/mpeg",
        });
        audioUrl = blob.url;
      } catch { /* fall through */ }
    }

    return NextResponse.json({
      audioBase64: base64,
      audioUrl,
      mimeType: "audio/mpeg",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
