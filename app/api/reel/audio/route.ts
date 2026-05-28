export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

const EL_KEY = process.env.ELEVENLABS_API_KEY!;
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

    let lastError = "";
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE_ID}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": EL_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: script,
              model_id: model,
              voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3 },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          lastError = `${model}: ${errText}`;
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return NextResponse.json({ audioBase64: base64, mimeType: "audio/mpeg", model });
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : "unknown"}`;
        continue;
      }
    }

    return NextResponse.json({ error: `All ElevenLabs models failed. Last: ${lastError}` }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
