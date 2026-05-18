"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TrackCard, type TrackData } from "@/components/TrackCard";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "cover", label: "Artworks" },
  { value: "sample", label: "Samples" },
  { value: "rating", label: "Song Ratings" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "plays", label: "Most Played" },
  { value: "likes", label: "Most Liked" },
];

interface FreesoundResult {
  id: number;
  name: string;
  username: string;
  duration: number;
  license: string;
  previews?: { "preview-hq-mp3"?: string };
}

function FreesoundTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FreesoundResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setSearched(true);
    setError("");
    const res = await fetch(`/api/freesound/search?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Search failed"); setStatus("error"); return; }
    setResults(data.results ?? []);
    setStatus("idle");
  };

  const handlePreview = (r: FreesoundResult) => {
    const sid = String(r.id);
    const url = r.previews?.["preview-hq-mp3"];
    if (!url) return;
    if (playingId === sid) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    audioRef.current = new Audio(url);
    audioRef.current.play();
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(sid);
  };

  const handleDownload = async (r: FreesoundResult) => {
    const sid = String(r.id);
    const previewUrl = r.previews?.["preview-hq-mp3"];
    if (!previewUrl) return;
    setDownloadingId(sid);
    const safe = r.name.replace(/[^a-z0-9._\-\s]/gi, "_").slice(0, 80);
    const a = document.createElement("a");
    a.href = `/api/freesound/download?url=${encodeURIComponent(previewUrl)}&filename=${encodeURIComponent(safe)}`;
    a.download = `${safe}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded((prev) => new Set(prev).add(sid));
    setDownloadingId(null);
  };

  return (
    <div>
      <p className="text-zinc-500 text-sm mb-5">
        Browse millions of CC-licensed sounds from{" "}
        <a href="https://freesound.org" target="_blank" rel="noopener noreferrer" className="text-[var(--funk-yellow)] hover:underline">freesound.org</a>.
        Preview and download to your device.
      </p>
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sounds… e.g. funk drum loop"
          className="flex-1 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-3 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 text-sm"
        >
          {status === "loading" ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((r) => {
            const sid = String(r.id);
            const isPlaying = playingId === sid;
            const isDownloading = downloadingId === sid;
            const isDone = downloaded.has(sid);
            return (
              <div key={r.id} className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl p-4 flex items-center gap-4">
                <button
                  onClick={() => handlePreview(r)}
                  className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-black transition-all text-sm ${
                    isPlaying ? "bg-[var(--funk-orange)] scale-95" : "bg-[var(--funk-yellow)] hover:scale-105"
                  }`}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                  <p className="text-xs text-zinc-500">
                    by {r.username} · {r.duration.toFixed(1)}s ·{" "}
                    <a href={`https://freesound.org/s/${r.id}/`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--funk-yellow)] transition-colors">
                      {r.license.replace("http://creativecommons.org/licenses/", "CC ").replace("/4.0/", "").replace("/3.0/", "")}
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(r)}
                  disabled={isDownloading}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex-shrink-0 ${
                    isDone ? "border border-green-600/40 text-green-400" : "bg-[var(--funk-yellow)] text-black hover:brightness-110"
                  }`}
                >
                  {isDownloading ? "…" : isDone ? "✓ Downloaded" : "↓ Download"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && status === "idle" && searched && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">🔇</p>
          <p>No sounds found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">🎧</p>
          <p className="text-sm">Search for any sound effect, loop, or instrument sample</p>
        </div>
      )}
    </div>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category") ?? "";
  const tabParam = searchParams.get("tab") ?? "funklab";

  const [activeTab, setActiveTab] = useState<"funklab" | "freesound">(tabParam === "freesound" ? "freesound" : "funklab");
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTracks = useCallback(async (cat: string, pg: number, q: string, s: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (q) params.set("search", q);
    if (s !== "newest") params.set("sort", s);
    params.set("page", String(pg));
    const res = await fetch(`/api/tracks?${params}`);
    const data = await res.json();
    setTracks(pg === 1 ? data.tracks : (prev: TrackData[]) => [...prev, ...data.tracks]);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab !== "funklab") return;
    setPage(1);
    setActiveCategory(categoryParam);
    fetchTracks(categoryParam, 1, search, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam, activeTab]);

  useEffect(() => {
    if (activeTab !== "funklab") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchTracks(activeCategory, 1, search, sort);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const switchCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    router.push(`/discover?${params}`);
  };

  const switchTab = (t: "funklab" | "freesound") => {
    setActiveTab(t);
    const params = new URLSearchParams();
    if (t === "freesound") params.set("tab", "freesound");
    router.replace(`/discover?${params}`, { scroll: false });
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTracks(activeCategory, next, search, sort);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-white">
          Discover <span className="text-[var(--funk-yellow)]">{activeTab === "freesound" ? "Sounds" : "Tracks"}</span>
        </h1>
      </div>

      {/* Top-level tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => switchTab("funklab")}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
            activeTab === "funklab" ? "bg-[var(--funk-yellow)] text-black" : "bg-[var(--funk-card)] border border-[var(--funk-border)] text-zinc-400 hover:text-white"
          }`}
        >
          Funk Lab
        </button>
        <button
          onClick={() => switchTab("freesound")}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
            activeTab === "freesound" ? "bg-[var(--funk-yellow)] text-black" : "bg-[var(--funk-card)] border border-[var(--funk-border)] text-zinc-400 hover:text-white"
          }`}
        >
          Freesound
        </button>
      </div>

      {activeTab === "freesound" ? (
        <FreesoundTab />
      ) : (
        <>
          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks…"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors text-sm"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[var(--funk-yellow)] outline-none transition-colors cursor-pointer"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => switchCategory(cat.value)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat.value
                    ? "bg-[var(--funk-yellow)] text-black"
                    : "bg-[var(--funk-card)] border border-[var(--funk-border)] text-zinc-400 hover:text-white hover:border-zinc-500"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Track grid */}
          {loading && tracks.length === 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-5 h-48 animate-pulse" />
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="text-5xl mb-4">{search ? "🔍" : "🎵"}</p>
              <p className="text-lg font-semibold">{search ? `No results for "${search}"` : "No tracks yet"}</p>
              {!search && <p className="text-sm mt-1">Be the first to drop something in this category!</p>}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {tracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
              {tracks.length < total && (
                <div className="text-center mt-10">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-8 py-3 border border-[var(--funk-border)] text-white rounded-full hover:border-[var(--funk-yellow)]/50 transition-all disabled:opacity-50"
                  >
                    {loading ? "Loading…" : "Load More"}
                  </button>
                  <p className="text-zinc-600 text-sm mt-2">
                    {tracks.length} of {total} tracks
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-12"><div className="h-8 w-48 bg-[var(--funk-card)] rounded animate-pulse mb-8" /></div>}>
      <DiscoverContent />
    </Suspense>
  );
}


function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category") ?? "";

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTracks = useCallback(async (cat: string, pg: number, q: string, s: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (q) params.set("search", q);
    if (s !== "newest") params.set("sort", s);
    params.set("page", String(pg));
    const res = await fetch(`/api/tracks?${params}`);
    const data = await res.json();
    setTracks(pg === 1 ? data.tracks : (prev: TrackData[]) => [...prev, ...data.tracks]);
    setTotal(data.total);
    setLoading(false);
  }, []);

  // Reset + fetch when category changes from URL
  useEffect(() => {
    setPage(1);
    setActiveCategory(categoryParam);
    fetchTracks(categoryParam, 1, search, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchTracks(activeCategory, 1, search, sort);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const switchCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    router.push(`/discover?${params}`);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTracks(activeCategory, next, search, sort);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-white mb-6">
        Discover <span className="text-[var(--funk-yellow)]">Tracks</span>
      </h1>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks…"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[var(--funk-yellow)] outline-none transition-colors cursor-pointer"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => switchCategory(cat.value)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === cat.value
                ? "bg-[var(--funk-yellow)] text-black"
                : "bg-[var(--funk-card)] border border-[var(--funk-border)] text-zinc-400 hover:text-white hover:border-zinc-500"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track grid */}
      {loading && tracks.length === 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-5xl mb-4">{search ? "🔍" : "🎵"}</p>
          <p className="text-lg font-semibold">{search ? `No results for "${search}"` : "No tracks yet"}</p>
          {!search && <p className="text-sm mt-1">Be the first to drop something in this category!</p>}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {tracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
          {tracks.length < total && (
            <div className="text-center mt-10">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-3 border border-[var(--funk-border)] text-white rounded-full hover:border-[var(--funk-yellow)]/50 transition-all disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load More"}
              </button>
              <p className="text-zinc-600 text-sm mt-2">
                {tracks.length} of {total} tracks
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-12"><div className="h-8 w-48 bg-[var(--funk-card)] rounded animate-pulse mb-8" /></div>}>
      <DiscoverContent />
    </Suspense>
  );
}
