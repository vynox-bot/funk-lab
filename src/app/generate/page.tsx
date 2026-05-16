"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MainTab = "artwork" | "sample" | "freesound";
type SampleTab = "oneshot" | "loop" | "vocal";
type Status = "idle" | "loading" | "error";

interface FreesoundResult {
  id: number;
  name: string;
  username: string;
  duration: number;
  license: string;
  previews?: { "preview-hq-mp3"?: string };
  tags?: string[];
}

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const INSTRUMENTS = ["Kick Drum", "Snare", "Hi-Hat", "Bass", "Piano", "Guitar", "Synth Lead", "Pad", "Percussion", "Clap", "Shaker"];
const STYLES = ["Punchy", "Soft", "Distorted", "Clean", "Warm", "Bright", "Dark", "Crispy", "Vintage"];
const GENRES = ["Hip-Hop", "EDM", "House", "Trap", "Drum & Bass", "Lo-Fi", "Jazz", "Funk", "R&B", "Techno", "Pop"];
const PITCHES = ["Normal", "Higher", "Lower"];
const TEMPOS = ["Slow", "Medium", "Fast"];
const BARS = ["1", "2", "4", "8"];

const inputClass =
  "w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none text-sm transition-colors";

const selectClass =
  "w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white focus:border-[var(--funk-yellow)] outline-none text-sm transition-colors appearance-none cursor-pointer";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{children}</label>;
}

function GenBtn({ loading, disabled, children }: { loading: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full py-3 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="animate-spin">⚙️</span> Generating… this may take ~30s
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default function GeneratePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [mainTab, setMainTab] = useState<MainTab>("artwork");
  const [sampleTab, setSampleTab] = useState<SampleTab>("oneshot");

  // Artwork
  const [artworkTitle, setArtworkTitle] = useState("");
  const [artworkPrompt, setArtworkPrompt] = useState("");
  const [artworkStatus, setArtworkStatus] = useState<Status>("idle");
  const [artworkError, setArtworkError] = useState("");

  // Oneshot
  const [osTitle, setOsTitle] = useState("");
  const [osKey, setOsKey] = useState("C");
  const [osBpm, setOsBpm] = useState("120");
  const [osInstrument, setOsInstrument] = useState("Kick Drum");
  const [osStyle, setOsStyle] = useState("Punchy");
  const [osStatus, setOsStatus] = useState<Status>("idle");
  const [osError, setOsError] = useState("");

  // Loop
  const [loopTitle, setLoopTitle] = useState("");
  const [loopKey, setLoopKey] = useState("C");
  const [loopBpm, setLoopBpm] = useState("120");
  const [loopBars, setLoopBars] = useState("4");
  const [loopGenre, setLoopGenre] = useState("Hip-Hop");
  const [loopStatus, setLoopStatus] = useState<Status>("idle");
  const [loopError, setLoopError] = useState("");

  // Vocal
  const [vocTitle, setVocTitle] = useState("");
  const [vocLyrics, setVocLyrics] = useState("");
  const [vocGenre, setVocGenre] = useState("R&B");
  const [vocPitch, setVocPitch] = useState("Normal");
  const [vocTempo, setVocTempo] = useState("Medium");
  const [vocStatus, setVocStatus] = useState<Status>("idle");
  const [vocError, setVocError] = useState("");

  // Freesound
  const [fsQuery, setFsQuery] = useState("");
  const [fsResults, setFsResults] = useState<FreesoundResult[]>([]);
  const [fsSearchStatus, setFsSearchStatus] = useState<Status>("idle");
  const [fsSearchError, setFsSearchError] = useState("");
  const [fsSavingId, setFsSavingId] = useState<string | null>(null);
  const [fsSaved, setFsSaved] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (authStatus === "loading") {
    return (
      <div className="flex justify-center py-24">
        <span className="animate-spin text-3xl">⚙️</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">✨</p>
        <h1 className="text-2xl font-black text-white mb-2">AI Studio</h1>
        <p className="text-zinc-400 mb-6">Sign in to generate artwork, samples, and more with AI.</p>
        <Link
          href="/login"
          className="px-6 py-3 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all"
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    setArtworkStatus("loading");
    setArtworkError("");
    const res = await fetch("/api/generate/artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: artworkTitle, prompt: artworkPrompt }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/tracks/${data.track.id}`);
    } else {
      setArtworkError(data.error ?? "Generation failed");
      setArtworkStatus("error");
    }
  };

  const handleOneshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setOsStatus("loading");
    setOsError("");
    const res = await fetch("/api/generate/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "oneshot", title: osTitle, key: osKey, bpm: osBpm, instrument: osInstrument, style: osStyle }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/tracks/${data.track.id}`);
    } else {
      setOsError(data.error ?? "Generation failed");
      setOsStatus("error");
    }
  };

  const handleLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoopStatus("loading");
    setLoopError("");
    const res = await fetch("/api/generate/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "loop", title: loopTitle, key: loopKey, bpm: loopBpm, bars: loopBars, genre: loopGenre }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/tracks/${data.track.id}`);
    } else {
      setLoopError(data.error ?? "Generation failed");
      setLoopStatus("error");
    }
  };

  const handleVocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setVocStatus("loading");
    setVocError("");
    const res = await fetch("/api/generate/vocal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: vocTitle, lyrics: vocLyrics, genre: vocGenre, pitch: vocPitch, tempo: vocTempo }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/tracks/${data.track.id}`);
    } else {
      setVocError(data.error ?? "Generation failed");
      setVocStatus("error");
    }
  };

  const handleFsSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFsSearchStatus("loading");
    setFsSearchError("");
    const res = await fetch(`/api/freesound/search?q=${encodeURIComponent(fsQuery)}`);
    const data = await res.json();
    if (res.ok) {
      setFsResults(data.results);
      setFsSearchStatus("idle");
    } else {
      setFsSearchError(data.error ?? "Search failed");
      setFsSearchStatus("error");
    }
  };

  const handleFsPreview = (result: FreesoundResult) => {
    const url = result.previews?.["preview-hq-mp3"];
    if (!url) return;
    const sid = String(result.id);
    if (playingId === sid) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(sid);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleFsSave = async (result: FreesoundResult) => {
    const sid = String(result.id);
    setFsSavingId(sid);
    const res = await fetch("/api/freesound/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previewUrl: result.previews?.["preview-hq-mp3"],
        soundName: result.name,
        username: result.username,
        license: result.license,
        freesoundId: result.id,
        title: result.name,
      }),
    });
    const data = await res.json();
    setFsSavingId(null);
    if (res.ok) {
      setFsSaved((prev) => ({ ...prev, [sid]: data.track.id }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabBtn = (id: MainTab, label: string) => (
    <button
      onClick={() => setMainTab(id)}
      className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
        mainTab === id
          ? "bg-[var(--funk-yellow)] text-black"
          : "text-zinc-400 hover:text-white border border-[var(--funk-border)]"
      }`}
    >
      {label}
    </button>
  );

  const sampleTabBtn = (id: SampleTab, label: string) => (
    <button
      onClick={() => setSampleTab(id)}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
        sampleTab === id
          ? "bg-[var(--funk-yellow)]/20 text-[var(--funk-yellow)] border border-[var(--funk-yellow)]/40"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">✨ AI Studio</h1>
        <p className="text-zinc-400 text-sm">Generate artwork and samples, or discover sounds from Freesound.</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {tabBtn("artwork", "🎨 Artwork")}
        {tabBtn("sample", "🎛️ Sample")}
        {tabBtn("freesound", "🔊 Freesound")}
      </div>

      {/* ── ARTWORK TAB ─────────────────────────────────────────────────────── */}
      {mainTab === "artwork" && (
        <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-6">
          <h2 className="font-black text-white text-lg mb-1">Generate Artwork</h2>
          <p className="text-zinc-500 text-xs mb-6">Powered by DALL-E 3 — describe any visual style you want.</p>
          <form onSubmit={handleArtwork} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <input
                type="text"
                value={artworkTitle}
                onChange={(e) => setArtworkTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. Neon City Vibes"
                className={inputClass}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Prompt — describe what you want</Label>
              <textarea
                value={artworkPrompt}
                onChange={(e) => setArtworkPrompt(e.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="e.g. A futuristic cityscape at night, neon purple and orange lights, anime style, ultra detailed"
                className={`${inputClass} resize-none`}
                required
              />
            </div>
            {artworkError && <p className="text-red-400 text-xs">{artworkError}</p>}
            <GenBtn loading={artworkStatus === "loading"}>✨ Generate Artwork</GenBtn>
          </form>
        </div>
      )}

      {/* ── SAMPLE TAB ──────────────────────────────────────────────────────── */}
      {mainTab === "sample" && (
        <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-6">
          <h2 className="font-black text-white text-lg mb-1">Generate Sample</h2>
          <p className="text-zinc-500 text-xs mb-4">Powered by ElevenLabs Sound Effects</p>

          {/* Sample sub-tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-[var(--funk-dark)] rounded-xl">
            {sampleTabBtn("oneshot", "Oneshot")}
            {sampleTabBtn("loop", "Loop")}
            {sampleTabBtn("vocal", "Vocal 🧪")}
          </div>

          {/* Oneshot */}
          {sampleTab === "oneshot" && (
            <form onSubmit={handleOneshot} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <input type="text" value={osTitle} onChange={(e) => setOsTitle(e.target.value)} maxLength={100} placeholder="e.g. Hard 808 Kick" className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Key</Label>
                  <select value={osKey} onChange={(e) => setOsKey(e.target.value)} className={selectClass}>
                    {KEYS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>BPM</Label>
                  <input type="number" value={osBpm} onChange={(e) => setOsBpm(e.target.value)} min={40} max={300} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Instrument</Label>
                  <select value={osInstrument} onChange={(e) => setOsInstrument(e.target.value)} className={selectClass}>
                    {INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Style</Label>
                  <select value={osStyle} onChange={(e) => setOsStyle(e.target.value)} className={selectClass}>
                    {STYLES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {osError && <p className="text-red-400 text-xs">{osError}</p>}
              <GenBtn loading={osStatus === "loading"}>✨ Generate Oneshot</GenBtn>
            </form>
          )}

          {/* Loop */}
          {sampleTab === "loop" && (
            <form onSubmit={handleLoop} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <input type="text" value={loopTitle} onChange={(e) => setLoopTitle(e.target.value)} maxLength={100} placeholder="e.g. Trap Beat Loop 140" className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Key</Label>
                  <select value={loopKey} onChange={(e) => setLoopKey(e.target.value)} className={selectClass}>
                    {KEYS.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>BPM</Label>
                  <input type="number" value={loopBpm} onChange={(e) => setLoopBpm(e.target.value)} min={40} max={300} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Bars</Label>
                  <select value={loopBars} onChange={(e) => setLoopBars(e.target.value)} className={selectClass}>
                    {BARS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Genre</Label>
                  <select value={loopGenre} onChange={(e) => setLoopGenre(e.target.value)} className={selectClass}>
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              {loopError && <p className="text-red-400 text-xs">{loopError}</p>}
              <GenBtn loading={loopStatus === "loading"}>✨ Generate Loop</GenBtn>
            </form>
          )}

          {/* Vocal */}
          {sampleTab === "vocal" && (
            <div className="flex flex-col gap-4">
              {/* Beta banner */}
              <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                <span className="text-lg leading-none mt-0.5">⚠️</span>
                <p className="text-orange-300 text-xs leading-relaxed">
                  <strong>Early Beta:</strong> Vocal creation is in very early beta and can be unstable. Results are AI text-to-speech, not singing — quality and accuracy may vary significantly.
                </p>
              </div>
              <form onSubmit={handleVocal} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Title</Label>
                  <input type="text" value={vocTitle} onChange={(e) => setVocTitle(e.target.value)} maxLength={100} placeholder="e.g. Midnight Verse" className={inputClass} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Lyrics</Label>
                  <textarea value={vocLyrics} onChange={(e) => setVocLyrics(e.target.value)} rows={5} maxLength={5000} placeholder="Paste your lyrics here…" className={`${inputClass} resize-none`} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Genre</Label>
                    <select value={vocGenre} onChange={(e) => setVocGenre(e.target.value)} className={selectClass}>
                      {GENRES.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Pitch</Label>
                    <select value={vocPitch} onChange={(e) => setVocPitch(e.target.value)} className={selectClass}>
                      {PITCHES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Tempo</Label>
                    <select value={vocTempo} onChange={(e) => setVocTempo(e.target.value)} className={selectClass}>
                      {TEMPOS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {vocError && <p className="text-red-400 text-xs">{vocError}</p>}
                <GenBtn loading={vocStatus === "loading"}>✨ Generate Vocal</GenBtn>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── FREESOUND TAB ───────────────────────────────────────────────────── */}
      {mainTab === "freesound" && (
        <div className="flex flex-col gap-6">
          <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-6">
            <h2 className="font-black text-white text-lg mb-1">Search Freesound</h2>
            <p className="text-zinc-500 text-xs mb-4">
              Browse millions of CC-licensed sounds from{" "}
              <a href="https://freesound.org" target="_blank" rel="noopener noreferrer" className="text-[var(--funk-yellow)] hover:underline">
                freesound.org
              </a>
              . Save any sound directly to your Funk Lab profile.
            </p>
            <form onSubmit={handleFsSearch} className="flex gap-3">
              <input
                type="text"
                value={fsQuery}
                onChange={(e) => setFsQuery(e.target.value)}
                placeholder="e.g. vinyl crackle, 808, jazz piano…"
                className={`${inputClass} flex-1`}
                required
              />
              <button
                type="submit"
                disabled={fsSearchStatus === "loading"}
                className="px-5 py-2.5 bg-[var(--funk-yellow)] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex-shrink-0"
              >
                {fsSearchStatus === "loading" ? "⚙️" : "Search"}
              </button>
            </form>
            {fsSearchError && <p className="text-red-400 text-xs mt-2">{fsSearchError}</p>}
          </div>

          {/* Results */}
          {fsResults.length > 0 && (
            <div className="flex flex-col gap-3">
              {fsResults.map((r) => {
                const sid = String(r.id);
                const isPlaying = playingId === sid;
                const isSaving = fsSavingId === sid;
                const savedTrackId = fsSaved[sid];
                return (
                  <div key={r.id} className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl p-4 flex items-center gap-4">
                    {/* Preview button */}
                    <button
                      onClick={() => handleFsPreview(r)}
                      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-black transition-all ${
                        isPlaying ? "bg-[var(--funk-orange)] scale-95" : "bg-[var(--funk-yellow)] hover:scale-105"
                      }`}
                      aria-label={isPlaying ? "Pause" : "Preview"}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        by {r.username} · {r.duration.toFixed(1)}s ·{" "}
                        <a
                          href={`https://freesound.org/s/${r.id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[var(--funk-yellow)] transition-colors"
                        >
                          {r.license.replace("http://creativecommons.org/licenses/", "CC ").replace("/4.0/", "").replace("/3.0/", "")}
                        </a>
                      </p>
                    </div>

                    {/* Save button */}
                    {savedTrackId ? (
                      <Link
                        href={`/tracks/${savedTrackId}`}
                        className="px-3 py-1.5 text-xs font-bold text-[var(--funk-yellow)] border border-[var(--funk-yellow)]/40 rounded-lg hover:bg-[var(--funk-yellow)]/10 transition-colors flex-shrink-0"
                      >
                        View ↗
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleFsSave(r)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-bold bg-[var(--funk-yellow)] text-black rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex-shrink-0"
                      >
                        {isSaving ? "⚙️" : "💾 Save"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fsResults.length === 0 && fsSearchStatus === "idle" && fsQuery && (
            <p className="text-center text-zinc-500 py-8">No results found for &ldquo;{fsQuery}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
