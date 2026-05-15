"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TrackCard, type TrackData } from "@/components/TrackCard";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "cover", label: "🎨 Artworks" },
  { value: "sample", label: "🎛️ Samples" },
  { value: "rating", label: "⭐ Song Ratings" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "plays", label: "Most Played" },
  { value: "likes", label: "Most Liked" },
];

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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
