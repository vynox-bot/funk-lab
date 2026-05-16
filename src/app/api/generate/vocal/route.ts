import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lyrics, genre, pitch, tempo, bpm, title, customStyle, published } = await req.json();

  if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
    return NextResponse.json({ error: "Lyrics are required" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  // Generate vocal using ElevenLabs TTS (works on free plan)
  // Map pitch to voice: Higher → Elli (F), Normal → Rachel (F), Lower → Adam (M)
  const voiceMap: Record<string, string> = {
    Higher: "MF3mGyEYCl7XYWbV9V6O",
    Normal: "21m00Tcm4TlvDq8ikWAM",
    Lower:  "pNInz6obpgDQGcFmaJgB",
  };
  const voiceId = voiceMap[pitch ?? "Normal"] ?? voiceMap.Normal;

  const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: lyrics.slice(0, 5000),
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
        style: 0.5,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!ttsRes.ok) {
    const err = await ttsRes.text();
    return NextResponse.json({ error: `Vocal generation failed: ${err}` }, { status: 500 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `generated/vocal-${session.user.id}-${Date.now()}.mp3`;
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: `Storage upload failed: ${err}` }, { status: 500 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

  const track = await prisma.track.create({
    data: {
      title: title.slice(0, 100),
      description: `AI Vocal | ${genre ?? "Unknown"} genre | ${pitch ?? "Normal"} pitch | ${tempo ?? "Medium"} tempo${bpm ? ` | ${bpm} BPM` : ""}\nLyrics: ${lyrics.slice(0, 300)}`,
      category: "sample",
      audioUrl: publicUrl,
      aiGenerated: true,
      published: published !== false,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ track, audioUrl: publicUrl });
}
