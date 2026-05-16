"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/lib/player-context";
import { StarRating } from "@/components/StarRating";

const CATEGORY_LABELS: Record<string, string> = {
  cover: "🎨 Artwork",
  sample: "🎛️ Sample",
  rating: "⭐ Song Rating",
};

interface RatingEntry {
  id: string;
  value: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null };
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null };
  replies?: Reply[];
}

interface Track {
  id: string;
  title: string;
  description: string | null;
  category: string;
  audioUrl: string | null;
  imageUrl: string | null;
  plays: number;
  createdAt: string;
  userId: string;
  aiGenerated: boolean;
  user: { id: string; name: string | null };
  _count: { likes: number; comments: number; ratings: number };
  likes?: { id: string }[];
  comments: Comment[];
  ratings: RatingEntry[];
  averageRating: number | null;
  userRating: RatingEntry | null;
}

function PlayWidget({ track }: { track: Track }) {
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const isThis = currentTrack?.id === track.id;

  const handleClick = () => {
    if (!track.audioUrl) return;
    if (isThis) {
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
    <div className="flex items-center gap-4 p-5 bg-zinc-900 rounded-2xl border border-[var(--funk-border)]">
      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-black font-bold text-xl flex-shrink-0 transition-all ${
          isThis && isPlaying
            ? "bg-[var(--funk-orange)] scale-95"
            : "bg-[var(--funk-yellow)] hover:scale-105"
        }`}
        aria-label={isThis && isPlaying ? "Pause" : "Play"}
      >
        {isThis && isPlaying ? "⏸" : "▶"}
      </button>
      <div className="min-w-0">
        <p className="text-white font-bold truncate">{track.title}</p>
        <p className="text-zinc-400 text-sm">
          {isThis ? (isPlaying ? "Now playing" : "Paused") : "Click to play"}
        </p>
      </div>
      <span className="text-zinc-600 text-sm ml-auto flex-shrink-0">▶ {track.plays.toLocaleString()}</span>
    </div>
  );
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const [track, setTrack] = useState<Track | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myRatingComment, setMyRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showSharedModal, setShowSharedModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setTrackId(id));
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("shared") === "1") {
      setShowSharedModal(true);
    }
  }, [params]);

  useEffect(() => {
    if (!trackId) return;
    fetch(`/api/tracks/${trackId}`)
      .then((r) => r.json())
      .then((data: Track) => {
        setTrack(data);
        setLikeCount(data._count.likes);
        setLiked(!!data.likes?.length);
        setComments(data.comments);
        setRatings(data.ratings);
        setAverageRating(data.averageRating);
        if (data.userRating) {
          setMyRating(data.userRating.value);
          setMyRatingComment(data.userRating.comment ?? "");
          setHasRated(true);
        }
        setLoading(false);
      });
  }, [trackId]);

  const handleLike = async () => {
    if (!session) return;
    const res = await fetch(`/api/tracks/${trackId}/like`, { method: "POST" });
    const data = await res.json();
    setLiked(data.liked);
    setLikeCount(data.count);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !session) return;
    setSubmittingComment(true);
    const res = await fetch(`/api/tracks/${trackId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    const data = await res.json();
    setSubmittingComment(false);
    if (res.ok) { setComments([data, ...comments]); setComment(""); }
  };

  const handleRate = async () => {
    if (!session || myRating === 0) return;
    setSubmittingRating(true);
    const res = await fetch(`/api/tracks/${trackId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: myRating, comment: myRatingComment.trim() || null }),
    });
    const data = await res.json();
    setSubmittingRating(false);
    if (res.ok) {
      setAverageRating(data.averageRating);
      setHasRated(true);
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 3000);
      // Refresh ratings list
      const updated = ratings.find((r) => r.user.id === session.user?.id);
      if (updated) {
        setRatings(ratings.map((r) =>
          r.user.id === session.user?.id
            ? { ...r, value: myRating, comment: myRatingComment.trim() || null }
            : r
        ));
      } else {
        setRatings([data.rating, ...ratings]);
      }
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?shared=1`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReply = async (parentId: string) => {
    if (!session || !replyContent.trim()) return;
    setSubmittingReply(true);
    const res = await fetch(`/api/tracks/${trackId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent.trim(), parentId }),
    });
    const data = await res.json();
    setSubmittingReply(false);
    if (res.ok) {
      setComments(comments.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies ?? []), data] }
          : c
      ));
      setReplyContent("");
      setReplyingTo(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this track?")) return;
    await fetch(`/api/tracks/${trackId}`, { method: "DELETE" });
    window.location.href = "/discover";
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-64 bg-[var(--funk-card)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🎵</p>
        <p className="text-zinc-400">Track not found</p>
        <Link href="/discover" className="text-[var(--funk-yellow)] hover:underline mt-4 inline-block">← Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Shared-link modal */}
      {showSharedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <p className="text-4xl mb-3">🎵</p>
            <h2 className="text-xl font-black text-white mb-2">Someone shared this with you</h2>
            <p className="text-zinc-400 text-sm mb-1">{track.title}</p>
            <p className="text-zinc-600 text-xs mb-6">by {track.user.name ?? "Unknown Artist"}</p>
            <button
              onClick={() => setShowSharedModal(false)}
              className="w-full py-3 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all"
            >
              Check it out ↓
            </button>
          </div>
        </div>
      )}

      <Link href="/discover" className="text-zinc-500 hover:text-[var(--funk-yellow)] text-sm transition-colors">
        ← Discover
      </Link>

      <div className="mt-6 bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl overflow-hidden">
        {/* Artwork image */}
        {track.category === "cover" && track.imageUrl && (
          <div className="relative aspect-square bg-zinc-900">
            <Image src={track.imageUrl} alt={track.title} fill className="object-contain" />
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-flex items-center text-xs font-semibold bg-[var(--funk-yellow)]/10 text-[var(--funk-yellow)] border border-[var(--funk-yellow)]/20 px-2.5 py-0.5 rounded-full mb-3">
                {CATEGORY_LABELS[track.category] ?? track.category}
              </span>
              {track.aiGenerated && (
                <span className="ml-2 inline-flex items-center text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full mb-3">
                  ✨ AI Generated
                </span>
              )}
              <h1 className="text-3xl font-black text-white">{track.title}</h1>
              <Link href={`/profile/${track.user.id}`} className="text-zinc-400 hover:text-white text-sm mt-1 inline-block transition-colors">
                by {track.user.name ?? "Unknown Artist"}
              </Link>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleShare}
                className="text-xs border border-[var(--funk-border)] text-zinc-400 hover:text-white hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? "✓ Copied!" : "Share"}
              </button>
              {session?.user?.id === track.userId && (
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-500 hover:text-red-400 border border-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Audio player widget */}
          {track.audioUrl && <PlayWidget track={track} />}

          {/* Average rating (rating tracks) */}
          {track.category === "rating" && (
            <div className="mt-6 p-5 bg-zinc-900/60 rounded-2xl border border-[var(--funk-border)] flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-black text-[var(--funk-yellow)]">
                  {averageRating != null ? averageRating.toFixed(1) : "—"}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">out of 5</p>
              </div>
              <div>
                <StarRating value={averageRating ?? 0} size="lg" />
                <p className="text-zinc-500 text-sm mt-1">{track._count.ratings} rating{track._count.ratings !== 1 ? "s" : ""}</p>
              </div>
            </div>
          )}

          {track.description && (
            <p className="text-zinc-400 text-sm mt-6 leading-relaxed">{track.description}</p>
          )}

          {/* Likes (cover + sample) */}
          {track.category !== "rating" && (
            <div className="flex items-center gap-4 mt-6 pb-6 border-b border-[var(--funk-border)]">
              <span className="text-zinc-500 text-sm">▶ {track.plays.toLocaleString()} plays · {new Date(track.createdAt).toLocaleDateString()}</span>
              <button
                onClick={handleLike}
                disabled={!session}
                className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm border transition-all ${
                  liked
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "border-[var(--funk-border)] text-zinc-400 hover:border-red-500/30 hover:text-red-400"
                } disabled:cursor-not-allowed`}
              >
                {liked ? "♥" : "♡"} {likeCount}
              </button>
            </div>
          )}

          {/* ─── RATING SECTION ─── */}
          {track.category === "rating" && (
            <div className="mt-6">
              <h2 className="font-bold text-white text-lg mb-4">Ratings</h2>

              {/* Submit / edit rating */}
              {session && session.user?.id !== track.userId && (
                <div className="bg-zinc-900/60 border border-[var(--funk-border)] rounded-2xl p-5 mb-6">
                  <p className="text-sm font-semibold text-zinc-300 mb-3">
                    {hasRated ? "Update your rating" : "Rate this track"}
                  </p>
                  <StarRating value={myRating} onChange={setMyRating} size="lg" />
                  {myRating > 0 && (
                    <p className="text-[var(--funk-yellow)] text-sm mt-1">{myRating} / 5 stars</p>
                  )}
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={myRatingComment}
                    onChange={(e) => setMyRatingComment(e.target.value)}
                    placeholder="Optional comment…"
                    className="w-full mt-3 bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none resize-none text-sm transition-colors"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={handleRate}
                      disabled={submittingRating || myRating === 0}
                      className="px-5 py-2 bg-[var(--funk-yellow)] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingRating ? "Submitting…" : hasRated ? "Update Rating" : "Submit Rating"}
                    </button>
                    {ratingSuccess && (
                      <span className="text-green-400 text-sm font-semibold">✓ Saved!</span>
                    )}
                  </div>
                </div>
              )}
              {!session && (
                <p className="text-zinc-500 text-sm mb-6">
                  <Link href="/login" className="text-[var(--funk-yellow)] hover:underline">Sign in</Link> to rate this track
                </p>
              )}
              {session?.user?.id === track.userId && (
                <p className="text-zinc-600 text-sm mb-6 italic">You cannot rate your own track.</p>
              )}

              {/* All ratings */}
              <div className="flex flex-col gap-4">
                {ratings.length === 0 ? (
                  <p className="text-zinc-600 text-sm py-4 text-center">No ratings yet — be the first!</p>
                ) : (
                  ratings.map((r) => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--funk-yellow)]/20 flex items-center justify-center text-sm font-black text-[var(--funk-yellow)] flex-shrink-0">
                        {(r.user.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/profile/${r.user.id}`} className="text-sm font-semibold text-white hover:text-[var(--funk-yellow)] transition-colors">
                            {r.user.name ?? "Anonymous"}
                          </Link>
                          <StarRating value={r.value} size="sm" />
                          <span className="text-xs font-bold text-[var(--funk-yellow)]">{r.value}</span>
                          <span className="text-xs text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="text-sm text-zinc-300 mt-1">{r.comment}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── COMMENTS SECTION (cover + sample) ─── */}
          {track.category !== "rating" && (
            <div className="mt-6">
              <h2 className="font-bold text-white mb-4">Comments ({comments.length})</h2>

              {session ? (
                <form onSubmit={handleComment} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment…"
                    maxLength={500}
                    className="flex-1 bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none text-sm transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !comment.trim()}
                    className="px-5 py-2.5 bg-[var(--funk-yellow)] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              ) : (
                <p className="text-zinc-500 text-sm mb-6">
                  <Link href="/login" className="text-[var(--funk-yellow)] hover:underline">Sign in</Link> to comment
                </p>
              )}

              <div className="flex flex-col gap-4">
                {comments.map((c) => (
                  <div key={c.id}>
                    {/* Top-level comment */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--funk-yellow)]/20 flex items-center justify-center text-xs font-black text-[var(--funk-yellow)] flex-shrink-0">
                        {(c.user.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/profile/${c.user.id}`} className="text-sm font-semibold text-white hover:text-[var(--funk-yellow)] transition-colors">
                            {c.user.name ?? "Anonymous"}
                          </Link>
                          <span className="text-xs text-zinc-600">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{c.content}</p>
                        {session && (
                          <button
                            onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyContent(""); }}
                            className="mt-1 text-xs text-zinc-500 hover:text-[var(--funk-yellow)] transition-colors"
                          >
                            {replyingTo === c.id ? "Cancel" : "Reply"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {(c.replies?.length ?? 0) > 0 && (
                      <div className="ml-11 mt-3 flex flex-col gap-3 border-l-2 border-[var(--funk-border)] pl-4">
                        {c.replies!.map((r) => (
                          <div key={r.id} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-[var(--funk-orange)]/20 flex items-center justify-center text-xs font-black text-[var(--funk-orange)] flex-shrink-0">
                              {(r.user.name ?? "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <Link href={`/profile/${r.user.id}`} className="text-xs font-semibold text-white hover:text-[var(--funk-yellow)] transition-colors">
                                  {r.user.name ?? "Anonymous"}
                                </Link>
                                <span className="text-xs text-zinc-600">{new Date(r.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-zinc-300">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === c.id && (
                      <div className="ml-11 mt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply…"
                          maxLength={500}
                          className="flex-1 bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-3 py-2 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none text-sm transition-colors"
                        />
                        <button
                          onClick={() => handleReply(c.id)}
                          disabled={submittingReply || !replyContent.trim()}
                          className="px-4 py-2 bg-[var(--funk-yellow)] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
