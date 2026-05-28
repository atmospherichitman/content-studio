export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

    const avatarId = process.env.HEYGEN_AVATAR_ID;
    const voiceId = process.env.HEYGEN_VOICE_ID;

    if (!avatarId || !voiceId) {
      return NextResponse.json({ error: "HeyGen avatar/voice IDs not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": HEYGEN_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: {
              type: "text",
              input_text: script,
              voice_id: voiceId,
            },
            background: {
              type: "color",
              value: "#000000",
            },
          },
        ],
        dimension: {
          width: 1080,
          height: 960,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: `HeyGen error: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    const videoId = data.data?.video_id || data.video_id;
    if (!videoId) {
      return NextResponse.json(
        { error: `No video ID in HeyGen response: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ videoId });
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

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${id}`,
      {
        headers: {
          "X-Api-Key": HEYGEN_API_KEY || "",
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: `HeyGen status error: ${JSON.stringify(data)}` },
        { status: 500 }
      );
    }

    const status = data.data?.status || data.status || "processing";
    const videoUrl = data.data?.video_url || data.video_url;

    return NextResponse.json({ status, videoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
