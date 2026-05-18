"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRES = ["Funk", "Soul", "Hip-Hop", "R&B", "Jazz", "Electronic", "Lo-fi", "Afrobeats", "Disco", "Gospel"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [bio, setBio] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 5 ? [...prev, g] : prev
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    // Save bio (genres stored client-side only for now — can be extended)
    if (bio.trim()) {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() }),
      });
    }
    router.push("/");
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? "bg-[var(--funk-yellow)]" : "bg-[var(--funk-border)]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <p className="text-6xl mb-4">🎉</p>
            <h1 className="text-3xl font-black text-white mb-2">
              Welcome to <span className="text-[var(--funk-yellow)]">Funk Lab!</span>
            </h1>
            <p className="text-zinc-500 mb-8">Let&apos;s set up your profile so the community can find you.</p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-[var(--funk-yellow)] text-black font-black text-lg rounded-xl hover:brightness-110 transition-all"
            >
              Let&apos;s go 🚀
            </button>
            <button onClick={() => router.push("/")} className="mt-3 text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Tell us about yourself</h2>
            <p className="text-zinc-500 text-sm mb-6">A short bio helps others know who you are.</p>
            <textarea
              rows={4}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Funk producer from Atlanta. I make beats that make people move 🎸"
              className="w-full bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-[var(--funk-yellow)] outline-none resize-none transition-colors"
            />
            <p className="text-zinc-600 text-xs text-right mb-6">{bio.length}/300</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-[var(--funk-border)] text-zinc-400 rounded-xl hover:text-white hover:border-zinc-500 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-[var(--funk-yellow)] text-black font-bold rounded-xl hover:brightness-110 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-1">What genres do you love?</h2>
            <p className="text-zinc-500 text-sm mb-6">Pick up to 5 — this helps personalise your discover feed.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    selectedGenres.includes(g)
                      ? "bg-[var(--funk-yellow)] text-black border-[var(--funk-yellow)]"
                      : "border-[var(--funk-border)] text-zinc-400 hover:text-white hover:border-zinc-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="bg-[var(--funk-card)] border border-[var(--funk-border)] rounded-xl p-4 mb-6">
              <p className="text-zinc-400 text-sm">🎵 <span className="font-semibold text-white">Drop your first track</span> — upload a sample, artwork, or a song to get rated by the community.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-[var(--funk-border)] text-zinc-400 rounded-xl hover:text-white hover:border-zinc-500 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 py-3 bg-[var(--funk-yellow)] text-black font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : "Enter the Lab 🎸"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
