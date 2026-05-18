"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  {
    value: "cover",
    label: "🎨 Artwork",
    desc: "Share your funk-inspired artwork or cover art",
    fileType: "image",
    accept: ".jpg,.jpeg,.png,.gif,.webp,.avif",
    maxMB: 10,
  },
  {
    value: "sample",
    label: "🎛️ Sample",
    desc: "Loops, Oneshots, Vocals and more",
    fileType: "audio",
    accept: ".mp3,.wav,.ogg,.flac,.aac,.m4a",
    maxMB: 50,
  },
  {
    value: "rating",
    label: "⭐ Song Rating",
    desc: "Upload a song for the community to rate",
    fileType: "audio",
    accept: ".mp3,.wav,.ogg,.flac,.aac,.m4a",
    maxMB: 50,
  },
];

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/ogg", "audio/flac", "audio/aac", "audio/mp4", "audio/x-m4a",
]);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
]);

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({ title: "", description: "", category: "" });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (status === "loading") return null;
  if (!session) {
    router.push("/login");
    return null;
  }

  const activeCat = CATEGORIES.find((c) => c.value === form.category);

  const handleFile = (f: File) => {
    if (!activeCat) { setError("Select a category first"); return; }
    const maxBytes = activeCat.maxMB * 1024 * 1024;
    if (f.size > maxBytes) { setError(`File too large. Max ${activeCat.maxMB}MB.`); return; }
    const allowed = activeCat.fileType === "audio" ? ALLOWED_AUDIO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowed.has(f.type)) {
      setError(`Invalid file type for ${activeCat.label}.`);
      return;
    }
    setFile(f);
    setError("");
    // Extract duration for audio files
    if (activeCat.fileType === "audio") {
      const url = URL.createObjectURL(f);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(isFinite(audio.duration) ? audio.duration : null);
        URL.revokeObjectURL(url);
      });
    } else {
      setAudioDuration(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a file"); return; }
    if (!form.category) { setError("Please select a category"); return; }
    if (!form.title.trim()) { setError("Please enter a title"); return; }

    setLoading(true);
    setProgress(20);

    const fd = new FormData();
    const fieldName = activeCat?.fileType === "image" ? "image" : "audio";
    fd.append(fieldName, file);
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("category", form.category);
    if (tags.length > 0) fd.append("tags", JSON.stringify(tags));
    if (audioDuration != null) fd.append("duration", String(audioDuration));

    try {
      setProgress(50);
      const res = await fetch("/api/tracks", { method: "POST", body: fd });
      setProgress(90);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setLoading(false);
        setProgress(0);
      } else {
        setProgress(100);
        router.push(`/tracks/${data.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Drop it in the <span className="text-[var(--funk-yellow)]">Lab</span>
        </h1>
        <p className="text-zinc-500 mt-1">Share something with the community</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-3">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => { setForm({ ...form, category: cat.value }); setFile(null); setError(""); }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.category === cat.value
                    ? "border-[var(--funk-yellow)] bg-[var(--funk-yellow)]/10 text-white"
                    : "border-[var(--funk-border)] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <p className="font-bold text-sm">{cat.label}</p>
                <p className="text-xs mt-1 opacity-70">{cat.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone — only shown when a category is selected */}
        {activeCat && (
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-[var(--funk-yellow)] bg-[var(--funk-yellow)]/5"
                : file
                ? "border-green-500/50 bg-green-900/10"
                : "border-[var(--funk-border)] hover:border-[var(--funk-yellow)]/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={activeCat.accept}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <p className="text-2xl mb-2">{activeCat.fileType === "image" ? "🖼️" : "🎵"}</p>
                <p className="text-white font-semibold">{file.name}</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-3">{activeCat.fileType === "image" ? "🎨" : "🎧"}</p>
                <p className="text-white font-semibold">Drag & drop your {activeCat.fileType} file</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {activeCat.accept.replace(/\./g, "").toUpperCase()} · Max {activeCat.maxMB}MB
                </p>
                <p className="text-[var(--funk-yellow)] text-sm mt-3">or click to browse</p>
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none"
            placeholder="Give it a name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Description</label>
          <textarea
            rows={3}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none resize-none"
            placeholder="Tell the community about it…"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Tags</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--funk-yellow)]/10 border border-[var(--funk-yellow)]/30 text-[var(--funk-yellow)] rounded-full text-xs font-semibold">
                #{tag}
                <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-zinc-500 hover:text-red-400 leading-none">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                  e.preventDefault();
                  const t = tagInput.trim();
                  if (!tags.includes(t) && tags.length < 10) setTags([...tags, t]);
                  setTagInput("");
                }
              }}
              maxLength={30}
              placeholder="e.g. funk, lofi, bass… (press Enter)"
              className="flex-1 bg-[var(--funk-dark)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] transition-colors outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const t = tagInput.trim();
                if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
                setTagInput("");
              }}
              className="px-4 py-2 border border-[var(--funk-border)] rounded-xl text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-sm"
            >
              Add
            </button>
          </div>
          <p className="text-zinc-600 text-xs mt-1">{tags.length}/10 tags · lowercase, letters and hyphens only</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {loading && (
          <div className="w-full bg-[var(--funk-border)] rounded-full h-2">
            <div
              className="bg-[var(--funk-yellow)] h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[var(--funk-yellow)] text-black font-black text-lg rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading…" : "Upload 🎸"}
        </button>
      </form>
    </div>
  );
}
