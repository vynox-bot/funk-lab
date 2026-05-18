import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [], count: 0 });
  }

  const apiKey = process.env.FREESOUND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Freesound not configured" }, { status: 503 });
  }

  const url = new URL("https://freesound.org/apiv2/search/text/");
  url.searchParams.set("query", q.slice(0, 200));
  url.searchParams.set("token", apiKey);
  url.searchParams.set("fields", "id,name,username,previews,license,duration,description,tags");
  url.searchParams.set("page_size", "12");
  url.searchParams.set("filter", "duration:[0.5 TO 120]");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Freesound search failed" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ results: data.results ?? [], count: data.count ?? 0 });
}
