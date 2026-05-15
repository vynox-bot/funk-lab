"use client";

import { useRef, useEffect, useState } from "react";
import { usePlayer } from "@/lib/player-context";
import Link from "next/link";

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const { currentTrack, isPlaying, togglePlay, pause } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [seeking, setSeeking] = useState(false);

  // Load a new track
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.audioUrl;
    audioRef.current.load();
    audioRef.current.play().catch(() => {});
    setCurrentTime(0);
    setDuration(0);
  }, [currentTrack]);

  // Play / pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-[var(--funk-border)] shadow-2xl">
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (!seeking) setCurrentTime(audioRef.current?.currentTime ?? 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={pause}
      />

      {/* Seekable progress bar */}
      <div
        className="w-full h-1.5 bg-[var(--funk-border)] cursor-pointer group hover:h-2.5 transition-all"
        onClick={handleSeek}
        onMouseDown={() => setSeeking(true)}
        onMouseUp={() => setSeeking(false)}
      >
        <div
          className="h-full bg-[var(--funk-yellow)] rounded-r-full relative transition-none"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--funk-yellow)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Track info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/tracks/${currentTrack.id}`}
            className="text-sm font-bold text-white truncate hover:text-[var(--funk-yellow)] transition-colors block"
          >
            {currentTrack.title}
          </Link>
          <p className="text-xs text-zinc-500 truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-zinc-600 tabular-nums w-10 text-right">
            {formatTime(currentTime)}
          </span>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[var(--funk-yellow)] text-black flex items-center justify-center text-base hover:brightness-110 transition-all"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <span className="text-xs text-zinc-600 tabular-nums w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-zinc-500 text-sm select-none">
            {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="w-20 accent-[var(--funk-yellow)] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
