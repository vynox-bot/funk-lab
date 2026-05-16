import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TrackCard, type TrackData } from "@/components/TrackCard";

async function getRecentTracks() {
  const tracks = await prisma.track.findMany({
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true, ratings: true } },
      ratings: { select: { value: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return tracks.map(({ ratings, ...t }) => ({
    ...t,
    averageRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10
        : null,
  }));
}

async function getStats() {
  const [trackCount, userCount] = await Promise.all([
    prisma.track.count(),
    prisma.user.count(),
  ]);
  return { trackCount, userCount };
}

export default async function HomePage() {
  const [tracks, stats] = await Promise.all([getRecentTracks(), getStats()]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--funk-dark)] via-[#1a0a2e] to-[var(--funk-dark)] py-24 px-4">
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-[var(--funk-yellow)]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-[var(--funk-purple)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[var(--funk-yellow)]/10 border border-[var(--funk-yellow)]/20 text-[var(--funk-yellow)] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            🎶 Home of the Brasilian Funk Community
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-white">Join the </span>
            <span className="text-[var(--funk-yellow)]">Funk Community</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
            Share your work with other people who respect it
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-[var(--funk-yellow)] text-black font-black rounded-full text-lg hover:brightness-110 transition-all hover:scale-105"
            >
              Join the Lab
            </Link>
            <Link
              href="/discover"
              className="px-8 py-3 border border-[var(--funk-border)] text-white font-bold rounded-full text-lg hover:border-[var(--funk-yellow)]/50 transition-all"
            >
              Browse Tracks
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-black text-white mb-8">
          What&apos;s in the lab?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "🎨",
              label: "Artworks",
              slug: "cover",
              desc: "Funk Cover Art - Promote your work",
              color: "from-pink-900/40 to-[var(--funk-card)]",
              border: "border-pink-500/30",
            },
            {
              icon: "🎛️",
              label: "Samples",
              slug: "sample",
              desc: "Loops, Oneshots, Vocals and more",
              color: "from-orange-900/40 to-[var(--funk-card)]",
              border: "border-orange-500/30",
            },
            {
              icon: "⭐",
              label: "Song Ratings",
              slug: "rating",
              desc: "Rate tracks and see what the community thinks",
              color: "from-yellow-900/40 to-[var(--funk-card)]",
              border: "border-yellow-500/30",
            },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/discover?category=${cat.slug}`}
              className={`bg-gradient-to-br ${cat.color} border ${cat.border} rounded-2xl p-6 hover:scale-[1.02] transition-transform group`}
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="text-xl font-black text-white mb-1">{cat.label}</h3>
              <p className="text-zinc-400 text-sm">{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent tracks */}
      {tracks.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white">Fresh Drops</h2>
            <Link
              href="/discover"
              className="text-sm text-[var(--funk-yellow)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={{ ...track, createdAt: track.createdAt.toISOString() }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
