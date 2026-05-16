import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lyrics, genre, pitch, tempo, title, customStyle } = await req.json();

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

  // Step 1: Generate a full song with Music Generation
  const effectiveStyle = (customStyle && String(customStyle).trim()) ? String(customStyle).trim() : null;
  const musicPrompt = effectiveStyle
    ? `${effectiveStyle}, singing these lyrics: ${lyrics.slice(0, 800)}`
    : [
        genre ? `${genre} song` : "pop song",
        pitch === "Higher" ? "with high-pitched vocals" : pitch === "Lower" ? "with deep vocals" : "with clear vocals",
        tempo === "Fast" ? "upbeat fast tempo" : tempo === "Slow" ? "slow ballad tempo" : "medium tempo",
        `Lyrics: ${lyrics.slice(0, 800)}`,
      ].join(", ");

  const musicRes = await fetch("https://api.elevenlabs.io/v1/music-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: musicPrompt.slice(0, 1000),
      duration: 30,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!musicRes.ok) {
    const err = await musicRes.text();
    return NextResponse.json({ error: `Music generation failed: ${err}` }, { status: 500 });
  }

  const musicBuffer = await musicRes.arrayBuffer();

  // Step 2: Extract vocal stems via Audio Isolation (falls back to full mix on failure)
  const formData = new FormData();
  formData.append("audio", new Blob([musicBuffer], { type: "audio/mpeg" }), "music.mp3");

  const isolateRes = await fetch("https://api.elevenlabs.io/v1/audio-isolation", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  const audioBuffer = isolateRes.ok ? await isolateRes.arrayBuffer() : musicBuffer;

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
      description: `AI Vocal | ${genre ?? "Unknown"} genre | ${pitch ?? "Normal"} pitch | ${tempo ?? "Medium"} tempo\nLyrics: ${lyrics.slice(0, 300)}`,
      category: "sample",
      audioUrl: publicUrl,
      aiGenerated: true,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ track, audioUrl: publicUrl });
}
