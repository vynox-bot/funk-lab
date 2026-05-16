"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "@/lib/theme-context";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { setPanelOpen } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--funk-dark)] border-b border-[var(--funk-border)] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🎵</span>
          <span className="font-black text-xl tracking-tight">
            <span className="text-[var(--funk-yellow)]">Funk</span>
            <span className="text-white"> Lab</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/discover"
            className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/discover?category=cover"
            className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors"
          >
            Artworks
          </Link>
          <Link
            href="/discover?category=sample"
            className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors"
          >
            Samples
          </Link>
          <Link
            href="/discover?category=rating"
            className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors"
          >
            Song Ratings
          </Link>
          <Link
            href="/generate"
            className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors"
          >
            ✨ Generate
          </Link>
        </div>

        {/* Theme button */}
        <button
          onClick={() => setPanelOpen(true)}
          title="Customize theme"
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white transition-colors text-lg"
          aria-label="Open theme panel"
        >
          🎨
        </button>

        {/* Auth */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <Link
                href="/upload"
                className="px-4 py-2 rounded-full bg-[var(--funk-yellow)] text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                + Upload
              </Link>
              <Link
                href="/generate"
                className="px-4 py-2 rounded-full border border-[var(--funk-border)] text-zinc-300 font-bold text-sm hover:text-white hover:border-[var(--funk-yellow)]/50 transition-all"
              >
                ✨ Generate
              </Link>
              <Link
                href={`/profile/${session.user?.id}`}
                className="text-zinc-400 hover:text-white transition-colors text-sm"
              >
                {session.user?.name ?? "Profile"}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-zinc-500 hover:text-red-400 transition-colors text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-400 hover:text-white transition-colors text-sm"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-[var(--funk-yellow)] text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                Join the Lab
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-zinc-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--funk-card)] border-t border-[var(--funk-border)] px-4 py-4 flex flex-col gap-3 text-sm">
          <Link href="/discover" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Discover</Link>
          <Link href="/discover?category=cover" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Artworks</Link>
          <Link href="/discover?category=sample" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Samples</Link>
          <Link href="/discover?category=rating" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Song Ratings</Link>
          <button
            onClick={() => { setMenuOpen(false); setPanelOpen(true); }}
            className="text-zinc-400 hover:text-white text-left text-sm flex items-center gap-2"
          >
            🎨 Customize Theme
          </button>
          <hr className="border-[var(--funk-border)]" />
          {session ? (
            <>
              <Link href="/upload" onClick={() => setMenuOpen(false)} className="text-[var(--funk-yellow)] font-bold">+ Upload</Link>
              <Link href="/generate" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">✨ Generate</Link>
              <Link href={`/profile/${session.user?.id}`} onClick={() => setMenuOpen(false)} className="text-zinc-300">{session.user?.name ?? "Profile"}</Link>
              <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="text-left text-red-400">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-zinc-300">Login</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="text-[var(--funk-yellow)] font-bold">Join the Lab</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
