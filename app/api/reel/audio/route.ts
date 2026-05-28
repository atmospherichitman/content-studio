export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const EL_KEY = process.env.ELEVENLABS_API_KEY!;
const EL_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "TX3LPaxmHKxFdv7VOQHJ";
const MODELS = [
  "eleven_turbo_v2_5",
  "eleven_turbo_v2",
  "eleven_multilingual_v2",
  "eleven_monolingual_v1",
];

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) return NextResponse.json({ error: "script is required" }, { status: 400 });

    // Generate audio with ElevenLabs (model fallback chain)
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
        if (!res.ok) { lastError = `${model}: ${await res.text()}`; continue; }
        audioBuffer = await res.arrayBuffer();
        break;
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : "unknown"}`;
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: `ElevenLabs failed: ${lastError}` }, { status: 500 });
    }

    const base64 = Buffer.from(audioBuffer).toString("base64");

    // Upload to R2 and generate presigned URL (valid 1 hour - plenty for Creatomate)
    let audioUrl: string | null = null;
    const r2 = getR2Client();
    if (r2) {
      try {
        const bucket = process.env.R2_BUCKET || "dum6downai-videos";
        const key = `reel-audio/audio-${Date.now()}.mp3`;
        await r2.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(audioBuffer),
          ContentType: "audio/mpeg",
        }));
        audioUrl = await getSignedUrl(r2, new PutObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
        // Build a proper GET presigned URL
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        audioUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
      } catch (e) {
        console.error("R2 upload failed:", e);
        audioUrl = null;
      }
    }

    // Try Vercel Blob as fallback
    if (!audioUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`reel-audio-${Date.now()}.mp3`, Buffer.from(audioBuffer), {
          access: "public",
          contentType: "audio/mpeg",
        });
        audioUrl = blob.url;
      } catch (e) {
        console.error("Vercel Blob upload failed:", e);
      }
    }

    if (!audioUrl) {
      return NextResponse.json({
        error: "Could not get a public audio URL. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET to Vercel env vars.",
      }, { status: 500 });
    }

    return NextResponse.json({ audioBase64: base64, audioUrl, mimeType: "audio/mpeg" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
