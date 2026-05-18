"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";
import {
  Bell, Upload, Sparkles, Search, Palette, Menu, X, Music2, LogOut, User,
} from "lucide-react";

type NotifItem = {
  id: string;
  type: "like" | "follow" | "comment";
  read: boolean;
  createdAt: string;
  actor: { id: string; name: string | null; image: string | null };
  track: { id: string; title: string } | null;
};

function NotifText({ n }: { n: NotifItem }) {
  const actor = n.actor.name ?? "Someone";
  if (n.type === "like") return <><span className="font-semibold text-white">{actor}</span> liked your track <span className="text-[var(--funk-yellow)]">{n.track?.title}</span></>;
  if (n.type === "follow") return <><span className="font-semibold text-white">{actor}</span> started following you</>;
  return <><span className="font-semibold text-white">{actor}</span> commented on <span className="text-[var(--funk-yellow)]">{n.track?.title}</span></>;
}

function NotifBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setUnread(data.unreadCount);
    setNotifs(data.notifications);
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[var(--funk-yellow)] text-black text-[10px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--funk-border)]">
            <p className="font-bold text-white text-sm">Notifications</p>
          </div>
          {notifs.length === 0 ? (
            <div className="py-10 text-center text-zinc-500">
              <p className="text-3xl mb-2">🔕</p>
              <p className="text-sm">Nothing yet — go get some likes!</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--funk-border)]">
              {notifs.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm hover:bg-white/5 transition-colors ${!n.read ? "bg-[var(--funk-yellow)]/5" : ""}`}>
                  <Link
                    href={n.track ? `/tracks/${n.track.id}` : `/profile/${n.actor.id}`}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    <NotifText n={n} />
                    <p className="text-zinc-600 text-xs mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { setPanelOpen } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-[var(--funk-dark)] border-b border-[var(--funk-border)] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Music2 className="w-6 h-6 text-[var(--funk-yellow)]" />
          <span className="font-black text-xl tracking-tight">
            <span className="text-[var(--funk-yellow)]">Funk</span>
            <span className="text-white"> Lab</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/discover" className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">Discover</Link>
          <Link href="/discover?category=cover" className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">Artworks</Link>
          <Link href="/discover?category=sample" className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">Samples</Link>
          <Link href="/discover?category=rating" className="text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">Song Ratings</Link>
        </div>

        {/* Right side controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme */}
          <button
            onClick={() => setPanelOpen(true)}
            title="Customize theme"
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Open theme panel"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Search */}
          <Link href="/search" className="p-2 text-zinc-400 hover:text-white transition-colors" aria-label="Search" title="Search">
            <Search className="w-5 h-5" />
          </Link>

          {session ? (
            <>
              <NotifBell userId={session.user?.id ?? ""} />
              <Link
                href="/upload"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--funk-yellow)] text-black font-bold text-sm hover:brightness-110 transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </Link>
              <Link
                href="/generate"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--funk-border)] text-zinc-300 font-bold text-sm hover:text-white hover:border-[var(--funk-yellow)]/50 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate
              </Link>
              <Link href={`/profile/${session.user?.id}`} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm p-2">
                <User className="w-4 h-4" />
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="p-2 text-zinc-500 hover:text-red-400 transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm px-3 py-2">Login</Link>
              <Link href="/register" className="px-4 py-2 rounded-full bg-[var(--funk-yellow)] text-black font-bold text-sm hover:brightness-110 transition-all">
                Join the Lab
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-zinc-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[var(--funk-card)] border-t border-[var(--funk-border)] px-4 py-4 flex flex-col gap-3 text-sm">
          <Link href="/discover" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Discover</Link>
          <Link href="/discover?category=cover" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Artworks</Link>
          <Link href="/discover?category=sample" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Samples</Link>
          <Link href="/discover?category=rating" onClick={() => setMenuOpen(false)} className="text-zinc-300 hover:text-[var(--funk-yellow)]">Song Ratings</Link>
          <Link href="/search" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-zinc-300 hover:text-[var(--funk-yellow)]">
            <Search className="w-4 h-4" /> Search
          </Link>
          <button
            onClick={() => { setMenuOpen(false); setPanelOpen(true); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-left text-sm"
          >
            <Palette className="w-4 h-4" /> Customize Theme
          </button>
          <hr className="border-[var(--funk-border)]" />
          {session ? (
            <>
              <Link href="/upload" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-[var(--funk-yellow)] font-bold">
                <Upload className="w-4 h-4" /> Upload
              </Link>
              <Link href="/generate" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-zinc-300 hover:text-[var(--funk-yellow)]">
                <Sparkles className="w-4 h-4" /> Generate
              </Link>
              <Link href={`/profile/${session.user?.id}`} onClick={() => setMenuOpen(false)} className="text-zinc-300">{session.user?.name ?? "Profile"}</Link>
              <button onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="flex items-center gap-2 text-left text-red-400">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
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
