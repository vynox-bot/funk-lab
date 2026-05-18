"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TrackCard, type TrackData } from "@/components/TrackCard";

type UserResult = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  _count: { tracks: number; followers: number };
};

const TABS = ["Tracks", "Users"] as const;
type Tab = (typeof TABS)[number];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const initialTab = (searchParams.get("tab") as Tab) ?? "Tracks";

  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (query: string, activeTab: Tab) => {
    if (!query.trim() || query.trim().length < 2) {
      setTracks([]);
      setUsers([]);
      return;
    }
    setLoading(true);
    if (activeTab === "Tracks") {
      const res = await fetch(`/api/tracks?search=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } else {
      const res = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(q, tab);
      // Update URL without full navigation
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("tab", tab);
      router.replace(`/search?${params}`, { scroll: false });
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tab]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setTracks([]);
    setUsers([]);
  };

  const hasResults = tab === "Tracks" ? tracks.length > 0 : users.length > 0;
  const searched = q.trim().length >= 2;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-white mb-6">
        Search <span className="text-[var(--funk-yellow)]">Funk Lab</span>
      </h1>

      {/* Search input */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for tracks, artists…"
          className="w-full pl-10 pr-4 py-3.5 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none transition-colors text-base"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t
                ? "bg-[var(--funk-yellow)] text-black"
                : "bg-[var(--funk-card)] border border-[var(--funk-border)] text-zinc-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🎸</p>
          <p className="text-zinc-400 text-lg font-semibold">What are you looking for?</p>
          <p className="text-zinc-600 text-sm mt-1">Type at least 2 characters to search</p>
        </div>
      )}

      {!loading && searched && !hasResults && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔇</p>
          <p className="text-zinc-400 text-lg font-semibold">No {tab.toLowerCase()} found for &ldquo;{q}&rdquo;</p>
          <p className="text-zinc-600 text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {!loading && tab === "Tracks" && tracks.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}

      {!loading && tab === "Users" && users.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Link key={user.id} href={`/profile/${user.id}`}
              className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-5 hover:border-[var(--funk-yellow)]/40 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name ?? ""} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--funk-yellow)]/20 flex items-center justify-center text-lg">
                    🎵
                  </div>
                )}
                <div>
                  <p className="font-bold text-white group-hover:text-[var(--funk-yellow)] transition-colors">{user.name ?? "Unknown"}</p>
                  <p className="text-zinc-500 text-xs">{user._count.tracks} track{user._count.tracks !== 1 ? "s" : ""} · {user._count.followers} follower{user._count.followers !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {user.bio && <p className="text-zinc-500 text-sm line-clamp-2">{user.bio}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-12"><div className="h-12 bg-[var(--funk-card)] rounded-2xl animate-pulse" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
