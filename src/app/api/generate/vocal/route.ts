import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Detect common section labels in lyrics and replace with minimax structure tags. */
function autoTagLyrics(raw: string): string {
  const tagMap: [RegExp, string][] = [
    [/^\s*[\[(]?\s*intro\s*\d*\s*[\])]?:?\s*$/im, "[Intro]"],
    [/^\s*[\[(]?\s*verse\s*\d*\s*[\])]?:?\s*$/im, "[Verse]"],
    [/^\s*[\[(]?\s*pre[- ]?chorus\s*\d*\s*[\])]?:?\s*$/im, "[Pre Chorus]"],
    [/^\s*[\[(]?\s*chorus\s*\d*\s*[\])]?:?\s*$/im, "[Chorus]"],
    [/^\s*[\[(]?\s*hook\s*\d*\s*[\])]?:?\s*$/im, "[Hook]"],
    [/^\s*[\[(]?\s*bridge\s*\d*\s*[\])]?:?\s*$/im, "[Bridge]"],
    [/^\s*[\[(]?\s*outro\s*\d*\s*[\])]?:?\s*$/im, "[Outro]"],
    [/^\s*[\[(]?\s*interlude\s*\d*\s*[\])]?:?\s*$/im, "[Interlude]"],
    [/^\s*[\[(]?\s*break\s*\d*\s*[\])]?:?\s*$/im, "[Break]"],
    [/^\s*[\[(]?\s*drop\s*\d*\s*[\])]?:?\s*$/im, "[Drop]"],
    [/^\s*[\[(]?\s*build\s*(?:up)?\s*\d*\s*[\])]?:?\s*$/im, "[Build Up]"],
    [/^\s*[\[(]?\s*solo\s*\d*\s*[\])]?:?\s*$/im, "[Solo]"],
  ];

  let tagged = raw;
  for (const [regex, tag] of tagMap) {
    tagged = tagged.replace(regex, tag);
  }

  // If no minimax tags found, wrap the whole thing in [Verse]
  if (!/\[(Verse|Chorus|Intro|Outro|Bridge|Hook|Drop|Pre Chorus|Interlude|Break|Build Up|Solo)\]/i.test(tagged)) {
    tagged = "[Verse]\n" + tagged;
  }

  return tagged;
}

/** Build a minimax prompt string from form fields. */
function buildPrompt(genre: string, pitch: string, tempo: string, bpm?: string, customStyle?: string): string {
  if (customStyle?.trim()) return customStyle.trim();

  const vocalGender = pitch?.startsWith("Higher")
    ? "female vocal"
    : pitch?.startsWith("Lower")
    ? "male vocal"
    : "";
  const bpmStr = bpm
    ? `${bpm} BPM`
    : tempo === "Slow"
    ? "70 BPM"
    : tempo === "Fast"
    ? "140 BPM"
    : "100 BPM";

  return [genre, bpmStr, vocalGender].filter(Boolean).join(", ");
}

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

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Music generation not configured" }, { status: 503 });
  }

  const taggedLyrics = autoTagLyrics(lyrics.slice(0, 3500));
  const prompt = buildPrompt(genre ?? "Pop", pitch ?? "Normal", tempo ?? "Medium", bpm, customStyle);

  const predRes = await fetch("https://api.replicate.com/v1/models/minimax/music-2.6/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      input: {
        lyrics: taggedLyrics,
        prompt,
        audio_format: "mp3",
        sample_rate: 44100,
        bitrate: 256000,
      },
    }),
  });

  if (!predRes.ok) {
    const err = await predRes.text();
    return NextResponse.json({ error: `Failed to start generation: ${err}` }, { status: 500 });
  }

  const prediction = await predRes.json();
  return NextResponse.json({ predictionId: prediction.id });
}
