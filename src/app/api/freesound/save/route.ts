import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { previewUrl, soundName, username, license, freesoundId, title } = await req.json();

  if (!previewUrl || typeof previewUrl !== "string") {
    return NextResponse.json({ error: "No preview URL provided" }, { status: 400 });
  }

  // Validate the URL comes from Freesound CDN
  const allowed = /^https:\/\/cdn\.freesound\.org\//;
  if (!allowed.test(previewUrl)) {
    return NextResponse.json({ error: "Invalid preview URL" }, { status: 400 });
  }

  const audioRes = await fetch(previewUrl);
  if (!audioRes.ok) {
    return NextResponse.json({ error: "Failed to download audio from Freesound" }, { status: 500 });
  }
  const audioBuffer = await audioRes.arrayBuffer();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "funk-lab";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const filename = `freesound/fs-${freesoundId ?? "unknown"}-${Date.now()}.mp3`;
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

  const safeTitle = title ?? soundName ?? "Freesound Sample";
  const attribution = [
    `From Freesound.org`,
    username ? `by ${username}` : null,
    license ? `License: ${license}` : null,
    freesoundId ? `https://freesound.org/s/${freesoundId}/` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const track = await prisma.track.create({
    data: {
      title: String(safeTitle).slice(0, 100),
      description: attribution,
      category: "sample",
      audioUrl: publicUrl,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ track, audioUrl: publicUrl });
}
