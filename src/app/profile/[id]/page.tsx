"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TrackCard, type TrackData } from "@/components/TrackCard";

interface UserProfile {
  id: string;
  name: string | null;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  image: string | null;
  createdAt: string;
  _count: { tracks: number; likes: number };
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "", website: "", twitter: "", instagram: "", image: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => setUserId(id));
  }, [params]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/users/${userId}`).then((r) => r.json()),
      fetch(`/api/tracks?userId=${userId}&limit=20`).then((r) => r.json()),
    ]).then(([user, trackData]) => {
      setProfile(user);
      setEditForm({ name: user.name ?? "", bio: user.bio ?? "", website: user.website ?? "", twitter: user.twitter ?? "", instagram: user.instagram ?? "", image: user.image ?? "" });
      setTracks(trackData.tracks);
      setLoading(false);
    });
  }, [userId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/users/${userId}/avatar`, { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setEditForm((prev) => ({ ...prev, image: data.url }));
      setProfile((prev) => prev ? { ...prev, image: data.url } : prev);
    }
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile((prev) => prev ? { ...prev, name: data.name, bio: data.bio, website: data.website, twitter: data.twitter, instagram: data.instagram, image: data.image } : prev);
      setEditing(false);
    }
    setSaving(false);
  };

  const isOwn = session?.user?.id === userId;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-40 bg-[var(--funk-card)] rounded-2xl animate-pulse mb-6" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-zinc-500">
        User not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile card */}
      <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-2xl p-8 mb-10">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-20 h-20 rounded-full overflow-hidden group/avatar">
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.image} alt={profile.name ?? "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--funk-yellow)]/20 flex items-center justify-center text-3xl font-black text-[var(--funk-yellow)]">
                  {(profile.name ?? "?")[0].toUpperCase()}
                </div>
              )}
              {isOwn && editing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full">
                  <span className="text-white text-xs font-bold">{uploadingAvatar ? "…" : "📷"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>
            {isOwn && editing && (
              <span className="text-[10px] text-zinc-600">
                {uploadingAvatar ? "Uploading…" : "Hover to change"}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={editForm.name}
                  maxLength={50}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2 text-white focus:border-[var(--funk-yellow)] outline-none text-lg font-bold"
                  placeholder="Your name"
                />
                <textarea
                  rows={3}
                  value={editForm.bio}
                  maxLength={500}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2 text-white focus:border-[var(--funk-yellow)] outline-none resize-none text-sm"
                  placeholder="Tell the community about yourself…"
                />
                <input
                  type="url"
                  value={editForm.website}
                  maxLength={200}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2 text-white focus:border-[var(--funk-yellow)] outline-none text-sm"
                  placeholder="Website (https://…)"
                />
                <input
                  type="text"
                  value={editForm.twitter}
                  maxLength={50}
                  onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })}
                  className="bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2 text-white focus:border-[var(--funk-yellow)] outline-none text-sm"
                  placeholder="Twitter / X handle (without @)"
                />
                <input
                  type="text"
                  value={editForm.instagram}
                  maxLength={50}
                  onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                  className="bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-2 text-white focus:border-[var(--funk-yellow)] outline-none text-sm"
                  placeholder="Instagram handle (without @)"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[var(--funk-yellow)] text-black font-bold text-sm rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-[var(--funk-border)] text-zinc-400 text-sm rounded-xl hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white">
                    {profile.name ?? "Anonymous Artist"}
                  </h1>
                  {isOwn && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-zinc-500 hover:text-[var(--funk-yellow)] border border-[var(--funk-border)] px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
                )}
                {/* Social links */}
                {(profile.website || profile.twitter || profile.instagram) && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors flex items-center gap-1">
                        🌐 {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {profile.twitter && (
                      <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">
                        𝕏 @{profile.twitter}
                      </a>
                    )}
                    {profile.instagram && (
                      <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-[var(--funk-yellow)] transition-colors">
                        📷 @{profile.instagram}
                      </a>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Stats */}
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-black text-white">{profile._count.tracks}</span>
                <span className="text-zinc-500 ml-1">uploads</span>
              </div>
              <div>
                <span className="font-black text-white">{profile._count.likes}</span>
                <span className="text-zinc-500 ml-1">likes given</span>
              </div>
              <div className="text-zinc-600">
                Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks */}
      <h2 className="text-xl font-black text-white mb-6">
      {isOwn ? "Your" : `${profile.name ?? "Their"}'s`} Uploads
      </h2>

      {tracks.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-4xl mb-3">🎵</p>
          <p>No tracks uploaded yet.</p>
          {isOwn && (
            <Link
              href="/upload"
              className="mt-4 inline-block text-[var(--funk-yellow)] hover:underline"
            >
              Upload your first track →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
