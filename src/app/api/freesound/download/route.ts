import { NextResponse } from "next/server";

// Proxies a Freesound CDN preview URL to the client as a file download,
// bypassing browser CORS restrictions on the `download` attribute.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") ?? "freesound-preview.mp3";

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only allow Freesound CDN URLs
  if (!url.startsWith("https://cdn.freesound.org/") && !url.startsWith("https://freesound.org/")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch audio" }, { status: 502 });
  }

  const safe = filename.replace(/[^a-z0-9._\-\s]/gi, "_").slice(0, 100);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${safe}.mp3"`,
      "Cache-Control": "no-store",
    },
  });
}
