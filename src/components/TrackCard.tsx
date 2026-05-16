"use client";

import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/lib/player-context";
import { StarRating } from "@/components/StarRating";

export interface TrackData {
  id: string;
  title: string;
  category: string;
  audioUrl: string | null;
  imageUrl: string | null;
  duration?: number | null;
  plays: number;
  createdAt: string;
  aiGenerated?: boolean;
  user: { id: string; name: string | null };
  _count: { likes: number; comments: number; ratings?: number };
  averageRating?: number | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  cover: "🎨 Artwork",
  sample: "🎛️ Sample",
  rating: "⭐ Song Rating",
};

const CATEGORY_COLORS: Record<string, string> = {
  cover: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  sample: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  rating: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export function TrackCard({ track }: { track: TrackData }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isThisTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (!track.audioUrl) return;
    if (isThisTrack) {
      togglePlay();
    } else {
      playTrack({
        id: track.id,
        title: track.title,
        audioUrl: track.audioUrl,
        artist: track.user.name ?? "Unknown Artist",
      });
    }
  };

  return (
    <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl overflow-hidden hover:border-[var(--funk-yellow)]/40 transition-colors group flex flex-col">
      {/* Artwork image for cover tracks */}
      {track.category === "cover" && (
        <Link href={`/tracks/${track.id}`} className="block aspect-square relative bg-zinc-900 flex-shrink-0">
          {track.imageUrl ? (
            <Image
              src={track.imageUrl}
              alt={track.title}
              fill
              className="object-cover group-hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🎨</div>
          )}
        </Link>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Category badge + play button row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${CATEGORY_COLORS[track.category] ?? "bg-zinc-500/20 text-zinc-300"}`}
          >
            {CATEGORY_LABELS[track.category] ?? track.category}
          </span>
          {track.aiGenerated && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              ✨ AI
            </span>
          )}

          {track.audioUrl && (
            <button
              onClick={handlePlay}
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-black transition-all ${
                isThisTrack && isPlaying
                  ? "bg-[var(--funk-orange)] scale-95"
                  : "bg-[var(--funk-yellow)] hover:scale-105"
              }`}
              aria-label={isThisTrack && isPlaying ? "Pause" : "Play"}
            >
              {isThisTrack && isPlaying ? (
                <span className="flex gap-0.5 items-end h-3.5">
                  <span className="w-0.5 h-3.5 bg-black rounded waveform-bar" style={{ animationDelay: "0ms" }} />
                  <span className="w-0.5 h-3.5 bg-black rounded waveform-bar" style={{ animationDelay: "150ms" }} />
                  <span className="w-0.5 h-3.5 bg-black rounded waveform-bar" style={{ animationDelay: "300ms" }} />
                </span>
              ) : (
                <span className="ml-0.5 text-sm">▶</span>
              )}
            </button>
          )}
        </div>

        {/* Title + Artist */}
        <div className="min-w-0">
          <Link href={`/tracks/${track.id}`}>
            <h3 className="font-bold text-white truncate group-hover:text-[var(--funk-yellow)] transition-colors">
              {track.title}
            </h3>
          </Link>
          <Link
            href={`/profile/${track.user.id}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {track.user.name ?? "Unknown Artist"}
          </Link>
        </div>

        {/* Average rating for song-rating tracks */}
        {track.category === "rating" && (
          <div className="flex items-center gap-2">
            <StarRating value={track.averageRating ?? 0} size="sm" />
            <span className="text-xs text-zinc-400">
              {track.averageRating != null ? track.averageRating.toFixed(1) : "No ratings yet"}
              {track._count.ratings != null && track._count.ratings > 0 && (
                <span className="text-zinc-600 ml-1">({track._count.ratings})</span>
              )}
            </span>
          </div>
        )}

        {/* Stats footer */}
        <div className="flex items-center justify-between text-xs text-zinc-600 mt-auto">
          <div className="flex items-center gap-3">
            {track.audioUrl && <span>▶ {track.plays.toLocaleString()}</span>}
            {track.duration != null && track.duration > 0 && (
              <span className="text-zinc-700">{formatDuration(track.duration)}</span>
            )}
            {track.category !== "rating" && <span>♥ {track._count.likes}</span>}
            {track.category !== "rating" && <span>💬 {track._count.comments}</span>}
            {track.category === "rating" && (
              <span>⭐ {track._count.ratings ?? 0} ratings</span>
            )}
          </div>
          <span>{new Date(track.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
